import { z } from 'zod';
import {
  dateCalendaireSchema,
  horodatageSchema,
  identifiantSchema,
  type Transitions,
} from './commun';
import { prioriteDecisionSchema } from './regles';

export const statutsDecision = [
  'brouillon',
  'validé',
  'envoyé',
  'appliqué',
  'non_appliqué',
  'rejeté',
] as const;

export const statutDecisionSchema = z.enum(statutsDecision);

export type StatutDecision = z.infer<typeof statutDecisionSchema>;

export const libellesStatutsDecision: Readonly<Record<StatutDecision, string>> = {
  brouillon: 'À valider',
  validé: 'Validée',
  envoyé: 'Envoyée au client',
  appliqué: 'Appliquée',
  non_appliqué: 'Non appliquée',
  rejeté: 'Rejetée',
};

/**
 * Cycle d'une recommandation (sur le modèle plan → recommandation → application) :
 * `brouillon → validé → envoyé → appliqué | non_appliqué`, ou `brouillon → rejeté`.
 *
 * Deux retours sont permis pour corriger le terrain :
 * - `non_appliqué → appliqué` : la recommandation a finalement été appliquée ;
 * - `appliqué → envoyé` : case « fait » décochée, uniquement tant que le réel n'est pas saisi
 *   (règle vérifiée par l'API).
 */
export const transitionsStatutDecision: Transitions<StatutDecision> = {
  brouillon: ['validé', 'rejeté'],
  validé: ['envoyé'],
  envoyé: ['appliqué', 'non_appliqué'],
  appliqué: ['envoyé'],
  non_appliqué: ['appliqué'],
  rejeté: [],
};

/** Statuts visibles dans l'espace client : tout ce qui a été envoyé, fait ou non. */
export const statutsVisiblesClient = [
  'envoyé',
  'appliqué',
  'non_appliqué',
] as const satisfies readonly StatutDecision[];

/** Qui a déclaré l'application : l'équipe (écran de suivi) ou le fermier/l'agent (espace client). */
export const declarantsApplication = ['equipe', 'espace_client'] as const;

export const declarantApplicationSchema = z.enum(declarantsApplication);

export type DeclarantApplication = z.infer<typeof declarantApplicationSchema>;

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

const produitSchema = z.string().trim().min(1).max(120);
/** Unité de dose libre et courte : `kg/ha`, `L/ha`, `mm`, `doses/ha`… */
const uniteDoseSchema = z.string().trim().min(1).max(20);
const doseSchema = z.number().nonnegative().max(100_000);
/** Montant en euros, pour toute la parcelle. */
const montantSchema = z.number().nonnegative().max(10_000_000);

/** Volet « prévu » : ce que l'équipe planifie, renseigné avant l'envoi. */
export const voletPrevuSchema = z.object({
  produit: produitSchema.nullable(),
  dose: doseSchema.nullable(),
  uniteDose: uniteDoseSchema.nullable(),
  date: dateCalendaireSchema.nullable(),
  coutEstime: montantSchema.nullable(),
});

export type VoletPrevu = z.infer<typeof voletPrevuSchema>;

export const PREVU_VIDE: VoletPrevu = {
  produit: null,
  dose: null,
  uniteDose: null,
  date: null,
  coutEstime: null,
};

/** Volet « réel » : ce qui a été fait sur le terrain, saisi après application. */
export const voletReelSchema = z.object({
  produit: produitSchema.nullable(),
  dose: doseSchema.nullable(),
  uniteDose: uniteDoseSchema.nullable(),
  date: dateCalendaireSchema,
  cout: montantSchema.nullable(),
  /** Une photo de l'application est disponible (`GET /decisions/:id/photo`). */
  photo: z.boolean(),
});

export type VoletReel = z.infer<typeof voletReelSchema>;

export const typesPhoto = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Photo d'application : 2 Mo au plus (le navigateur la réduit avant envoi). */
export const TAILLE_MAX_PHOTO_OCTETS = 2 * 1024 * 1024;

export const photoApplicationSchema = z.object({
  type: z.enum(typesPhoto),
  /** Contenu encodé en base64 (sans préfixe `data:`). */
  base64: z
    .string()
    .min(1)
    .max(Math.ceil((TAILLE_MAX_PHOTO_OCTETS * 4) / 3) + 4, 'Photo trop lourde (2 Mo maximum)'),
});

export type PhotoApplication = z.infer<typeof photoApplicationSchema>;

/**
 * Saisie du réel. La date d'application est obligatoire ; `photo` absente = inchangée,
 * `null` = supprimée.
 */
export const saisieReelSchema = z.object({
  produit: produitSchema.nullable().optional(),
  dose: doseSchema.nullable().optional(),
  uniteDose: uniteDoseSchema.nullable().optional(),
  date: dateCalendaireSchema,
  cout: montantSchema.nullable().optional(),
  photo: photoApplicationSchema.nullable().optional(),
});

export type SaisieReel = z.infer<typeof saisieReelSchema>;

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
  prevu: voletPrevuSchema,
  /** `null` tant que l'application n'a pas été saisie. */
  reel: voletReelSchema.nullable(),
  appliqueeLe: horodatageSchema.nullable(),
  applicationDeclareePar: declarantApplicationSchema.nullable(),
  nonAppliqueeLe: horodatageSchema.nullable(),
  /** Pourquoi la recommandation n'a pas été appliquée (usage interne). */
  motifNonApplication: z.string().nullable(),
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
 * Le contenu n'est modifiable qu'en `brouillon`, le prévu tant que la décision n'est pas
 * envoyée, le réel seulement pour une décision (ou un passage) `appliqué`.
 * Le statut suit `transitionsStatutDecision` ; `motifRejet` accompagne `rejeté`,
 * `motifNonApplication` (obligatoire) accompagne `non_appliqué`.
 */
export const modifierDecisionSchema = z.object({
  noeudIds: noeudIdsSchema.optional(),
  explication: explicationSchema.optional(),
  statut: statutDecisionSchema.optional(),
  motifRejet: z.string().trim().min(1).max(500).optional(),
  prevu: voletPrevuSchema.partial().optional(),
  reel: saisieReelSchema.optional(),
  motifNonApplication: z.string().trim().min(1).max(500).optional(),
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
 * Ce que voit le client : les décisions envoyées (faites ou non), sans les données internes
 * (nœuds, motifs, coûts, historique de validation).
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
  /** Ce qui est prévu, sans le coût estimé (usage interne). */
  prevu: voletPrevuSchema.omit({ coutEstime: true }),
  envoyeeLe: horodatageSchema,
  /** Case « fait » : la recommandation a été appliquée. */
  fait: z.boolean(),
  /** Date de l'application (saisie du réel) ou, à défaut, de la déclaration. */
  faitLe: z.string().nullable(),
  /** Le conseiller a saisi l'application réelle : la case ne peut plus être décochée. */
  faitConfirme: z.boolean(),
});

export type DecisionClient = z.infer<typeof decisionClientSchema>;
