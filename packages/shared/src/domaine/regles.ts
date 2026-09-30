import { z } from 'zod';

export const operateursRegle = ['<', '<=', '>', '>=', '=', '!='] as const;

export type OperateurRegle = (typeof operateursRegle)[number];

export const libellesOperateurs: Readonly<Record<OperateurRegle, string>> = {
  '<': 'inférieur à',
  '<=': 'inférieur ou égal à',
  '>': 'supérieur à',
  '>=': 'supérieur ou égal à',
  '=': 'égal à',
  '!=': 'différent de',
};

export const prioritesDecision = ['basse', 'normale', 'haute'] as const;

export const prioriteDecisionSchema = z.enum(prioritesDecision);

export type PrioriteDecision = z.infer<typeof prioriteDecisionSchema>;

/** Priorité formulée pour l'agriculteur (rapport PDF, espace client). */
export const libellesPrioriteClient: Readonly<Record<PrioriteDecision, string>> = {
  haute: 'À faire en priorité',
  normale: 'Recommandé',
  basse: 'Si possible',
};

/** Rang d'affichage : la priorité haute d'abord (une priorité absente compte comme normale). */
export function rangPriorite({ priorite }: { priorite: PrioriteDecision | null }): number {
  return { haute: 0, normale: 1, basse: 2 }[priorite ?? 'normale'];
}

/** Variables utilisables dans le modèle d'explication d'une règle. */
export const variablesExplication = ['valeur', 'seuil', 'indicateur'] as const;

/**
 * Modèle d'explication : une phrase, sans retour à la ligne, qui peut contenir
 * `{valeur}`, `{seuil}` et `{indicateur}`. Plus court que l'explication finale (300)
 * pour laisser la place aux valeurs.
 */
export const modeleExplicationSchema = z
  .string()
  .trim()
  .min(1, 'L’explication est obligatoire')
  .max(250)
  .refine((texte) => !/[\r\n]/.test(texte), {
    message: 'L’explication doit tenir en une seule phrase, sans retour à la ligne',
  });

/** Règle métier : « si <indicateur> <opérateur> <seuil> alors <recommandation> ». */
export const regleMetierSchema = z.object({
  id: z.string().min(1),
  nom: z.string().trim().min(1, 'Donnez un nom à la règle').max(80),
  active: z.boolean().default(true),
  indicateur: z.string().trim().min(1, 'Choisissez un indicateur'),
  operateur: z.enum(operateursRegle),
  seuil: z.number({ error: 'Le seuil doit être un nombre' }),
  recommandation: z.string().trim().min(1, 'La recommandation est obligatoire').max(300),
  explication: modeleExplicationSchema,
  priorite: prioriteDecisionSchema.default('normale'),
});

export type RegleMetier = z.infer<typeof regleMetierSchema>;

interface ComparerParams {
  valeur: number;
  operateur: OperateurRegle;
  seuil: number;
}

/** Évalue la condition d'une règle (égalité à 1e-9 près). */
export function comparer({ valeur, operateur, seuil }: ComparerParams): boolean {
  const egal = Math.abs(valeur - seuil) < 1e-9;
  switch (operateur) {
    case '<':
      return valeur < seuil && !egal;
    case '<=':
      return valeur < seuil || egal;
    case '>':
      return valeur > seuil && !egal;
    case '>=':
      return valeur > seuil || egal;
    case '=':
      return egal;
    case '!=':
      return !egal;
  }
}

/** Nombre au format français, 3 décimales au plus. */
export function formaterNombre({ nombre }: { nombre: number }): string {
  return nombre.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

interface InterpolerExplicationParams {
  modele: string;
  valeur: number;
  seuil: number;
  indicateur: string;
}

/** Remplace `{valeur}`, `{seuil}` et `{indicateur}` dans le modèle d'explication. */
export function interpolerExplication({
  modele,
  valeur,
  seuil,
  indicateur,
}: InterpolerExplicationParams): string {
  const remplacements: Record<(typeof variablesExplication)[number], string> = {
    valeur: formaterNombre({ nombre: valeur }),
    seuil: formaterNombre({ nombre: seuil }),
    indicateur,
  };
  return modele.replace(
    /\{(valeur|seuil|indicateur)\}/g,
    (_, variable: keyof typeof remplacements) => remplacements[variable],
  );
}

/** Données qui ont motivé une décision : la mesure et la condition qui l'a déclenchée. */
export const motifDecisionSchema = z.object({
  indicateur: z.string(),
  valeur: z.number(),
  operateur: z.enum(operateursRegle),
  seuil: z.number(),
});

export type MotifDecision = z.infer<typeof motifDecisionSchema>;

/** Décision proposée par une règle déclenchée, avant son enregistrement en brouillon. */
export const decisionProposeeSchema = z.object({
  regleId: z.string(),
  regleNom: z.string(),
  priorite: prioriteDecisionSchema,
  recommandation: z.string(),
  /** Le « pourquoi » : explication interpolée, une phrase. */
  explication: z.string(),
  motif: motifDecisionSchema,
});

export type DecisionProposee = z.infer<typeof decisionProposeeSchema>;

/** Résultat de l'évaluation d'un jeu de règles. */
export const resultatReglesSchema = z.object({
  declenchees: z.array(decisionProposeeSchema),
  /** Règles actives non évaluées (indicateur absent des entrées). */
  ignorees: z.array(z.object({ regleId: z.string(), regleNom: z.string(), raison: z.string() })),
  nombreEvaluees: z.int().nonnegative(),
});

export type ResultatRegles = z.infer<typeof resultatReglesSchema>;
