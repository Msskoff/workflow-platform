import { z } from 'zod';
import { horodatageSchema, identifiantSchema, type Transitions } from './commun';

export const statutsDecision = ['brouillon', 'validé', 'envoyé'] as const;

export const statutDecisionSchema = z.enum(statutsDecision);

export type StatutDecision = z.infer<typeof statutDecisionSchema>;

/** Cycle de vie d'une décision : pas de retour en arrière. */
export const transitionsStatutDecision: Transitions<StatutDecision> = {
  brouillon: ['validé'],
  validé: ['envoyé'],
  envoyé: [],
};

/** Explication lisible par le fermier : une seule phrase, sans retour à la ligne. */
export const explicationSchema = z
  .string()
  .trim()
  .min(1)
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
  statut: statutDecisionSchema,
  valideeLe: horodatageSchema.nullable(),
  envoyeeLe: horodatageSchema.nullable(),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Decision = z.infer<typeof decisionSchema>;

/** Une décision est toujours créée en `brouillon`. */
export const creerDecisionSchema = z.object({
  executionId: identifiantSchema,
  noeudIds: noeudIdsSchema,
  explication: explicationSchema,
});

export type CreerDecision = z.infer<typeof creerDecisionSchema>;

/** Le contenu n'est modifiable qu'en `brouillon` ; le statut suit `transitionsStatutDecision`. */
export const modifierDecisionSchema = z.object({
  noeudIds: noeudIdsSchema.optional(),
  explication: explicationSchema.optional(),
  statut: statutDecisionSchema.optional(),
});

export type ModifierDecision = z.infer<typeof modifierDecisionSchema>;

export const filtreDecisionsSchema = z.object({
  executionId: identifiantSchema.optional(),
  statut: statutDecisionSchema.optional(),
});

export type FiltreDecisions = z.infer<typeof filtreDecisionsSchema>;
