import { z } from 'zod';
import { horodatageSchema, identifiantSchema, texteCourtSchema } from './commun';
import { grapheWorkflowSchema } from './workflow-snapshot';

/**
 * Modèle de workflow : graphe réutilisable (nœuds, paramètres, positions, connexions)
 * que l'éditeur charge en un clic. Les modèles prédéfinis sont fournis par la plateforme
 * et ne sont pas modifiables ; on les charge puis on les enregistre sous un autre nom.
 */
export const modeleWorkflowSchema = z.object({
  id: identifiantSchema,
  /** Identifiant stable des modèles prédéfinis (ex. `diagnostic-initial-parcelle`). */
  code: z.string().nullable(),
  nom: texteCourtSchema,
  description: z.string(),
  predefini: z.boolean(),
  graphe: grapheWorkflowSchema,
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type ModeleWorkflow = z.infer<typeof modeleWorkflowSchema>;

/** Entrée de la liste des modèles, sans le graphe. */
export const resumeModeleSchema = modeleWorkflowSchema
  .omit({ graphe: true })
  .extend({ nombreNoeuds: z.int().nonnegative() });

export type ResumeModele = z.infer<typeof resumeModeleSchema>;

export const creerModeleSchema = z.object({
  nom: texteCourtSchema,
  description: z.string().trim().max(1000).default(''),
  graphe: grapheWorkflowSchema,
});

export type CreerModele = z.infer<typeof creerModeleSchema>;

export const modifierModeleSchema = z.object({
  nom: texteCourtSchema.optional(),
  description: z.string().trim().max(1000).optional(),
  graphe: grapheWorkflowSchema.optional(),
});

export type ModifierModele = z.infer<typeof modifierModeleSchema>;
