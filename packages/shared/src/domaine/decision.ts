import { z } from 'zod';
import { horodatageSchema, identifiantSchema, type Transitions } from './commun';
import { prioriteDecisionSchema } from './regles';

export const statutsDecision = ['brouillon', 'validé', 'envoyé', 'rejeté'] as const;

export const statutDecisionSchema = z.enum(statutsDecision);

export type StatutDecision = z.infer<typeof statutDecisionSchema>;

export const libellesStatutsDecision: Readonly<Record<StatutDecision, string>> = {
  brouillon: 'À valider',
  validé: 'Validée',
  envoyé: 'Envoyée au client',
  rejeté: 'Rejetée',
};

/**
 * Cycle de vie d'une décision, sans retour en arrière :
 * `brouillon → validé → envoyé`, ou `brouillon → rejeté`.
 * Seules les décisions `envoyé` sont visibles dans l'espace client.
 */
export const transitionsStatutDecision: Transitions<StatutDecision> = {
  brouillon: ['validé', 'rejeté'],
  validé: ['envoyé'],
  envoyé: [],
  rejeté: [],
};

/** Explication lisible par le fermier : une seule phrase, sans retour à la ligne. */
export const explicationSchema = z
  .string()
  .trim()
  .min(1, 'L’explication est obligatoire')
  .max(300)
  .refine((texte) => !/[\r\n]/.test(texte), {
    message: "L'explication doit tenir en une seule phrase, sans retour à la ligne",
  });

const noeudIdsSchema = z
  .array(identifiantSchema)
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Un même nœud ne peut pas être référencé deux fois',
  });

/**
 * Décision produite par une exécution. `noeudIds` référence les nœuds du snapshot
 * de l'exécution qui l'ont produite (traçabilité).
 */
export const decisionSchema = z.object({
  id: identifiantSchema,
  executionId: identifiantSchema,
  noeudIds: noeudIdsSchema,
  explication: explicationSchema,
  /** Action conseillée par la règle métier ; `null` pour une décision saisie à la main. */
  recommandation: z.string().nullable(),
  priorite: prioriteDecisionSchema.nullable(),
  /** Données qui ont motivé la décision : indicateur, valeur mesurée, condition, source. */
  donnees: z.record(z.string(), z.json()).nullable(),
  statut: statutDecisionSchema,
  valideeLe: horodatageSchema.nullable(),
  envoyeeLe: horodatageSchema.nullable(),
  rejeteeLe: horodatageSchema.nullable(),
  /** Raison donnée par l'agronome lors du rejet (usage interne). */
  motifRejet: z.string().nullable(),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Decision = z.infer<typeof decisionSchema>;

/** Une décision est toujours créée en `brouillon`. */
export const creerDecisionSchema = z.object({
  executionId: identifiantSchema,
  noeudIds: noeudIdsSchema,
  explication: explicationSchema,
  recommandation: z.string().trim().min(1).max(300).optional(),
  priorite: prioriteDecisionSchema.optional(),
  donnees: z.record(z.string(), z.json()).optional(),
});

export type CreerDecision = z.infer<typeof creerDecisionSchema>;

/**
 * Le contenu n'est modifiable qu'en `brouillon` ; le statut suit `transitionsStatutDecision`.
 * `motifRejet` n'est accepté qu'avec le passage à `rejeté`.
 */
export const modifierDecisionSchema = z.object({
  noeudIds: noeudIdsSchema.optional(),
  explication: explicationSchema.optional(),
  statut: statutDecisionSchema.optional(),
  motifRejet: z.string().trim().min(1).max(500).optional(),
});

export type ModifierDecision = z.infer<typeof modifierDecisionSchema>;

export const filtreDecisionsSchema = z.object({
  executionId: identifiantSchema.optional(),
  statut: statutDecisionSchema.optional(),
});

export type FiltreDecisions = z.infer<typeof filtreDecisionsSchema>;

export const filtreRevueSchema = z.object({
  statut: statutDecisionSchema.optional(),
  clientId: identifiantSchema.optional(),
});

export type FiltreRevue = z.infer<typeof filtreRevueSchema>;

/** Contexte d'une décision pour l'écran de revue : d'où vient-elle, pour qui ? */
export const decisionEnRevueSchema = z.object({
  decision: decisionSchema,
  execution: z.object({
    id: identifiantSchema,
    version: z.int().positive(),
    workflowNom: z.string(),
    termineeLe: horodatageSchema.nullable(),
  }),
  campagne: z.object({ id: identifiantSchema, nom: z.string() }),
  parcelle: z.object({ id: identifiantSchema, nom: z.string(), surfaceHa: z.number() }),
  client: z.object({ id: identifiantSchema, nom: z.string() }),
  /** Libellés des nœuds de la chaîne de traçabilité, dans l'ordre de `decision.noeudIds`. */
  chaine: z.array(z.object({ noeudId: z.string(), type: z.string(), libelle: z.string() })),
});

export type DecisionEnRevue = z.infer<typeof decisionEnRevueSchema>;

/**
 * Ce que voit le client : uniquement les décisions `envoyé`, sans les données internes
 * (nœuds, motif de rejet, historique de validation).
 */
export const decisionClientSchema = z.object({
  id: identifiantSchema,
  /** Analyse (exécution) qui a produit la décision. */
  analyseId: identifiantSchema,
  parcelle: z.object({ id: identifiantSchema, nom: z.string() }),
  campagne: z.object({ id: identifiantSchema, nom: z.string() }),
  recommandation: z.string().nullable(),
  explication: z.string(),
  priorite: prioriteDecisionSchema.nullable(),
  envoyeeLe: horodatageSchema,
});

export type DecisionClient = z.infer<typeof decisionClientSchema>;
