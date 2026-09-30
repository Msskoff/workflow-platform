import { z } from 'zod';
import { campagneSchema } from './campagne';
import { calendrierPrevisionnelSchema, cultureSchema } from './culture';
import { resumeModeleSchema } from './modele-workflow';

/**
 * Ce que le système propose pour une culture à partir d'une date de début : les modèles
 * de workflow rattachés à la culture (les prédéfinis d'abord) et le calendrier prévisionnel
 * des interventions, avec les doses de référence du premier modèle proposé.
 */
export const propositionCampagneSchema = z.object({
  culture: cultureSchema,
  modeles: z.array(resumeModeleSchema),
  /** Modèle dont les doses de référence alimentent le calendrier (`null` s'il n'y en a pas). */
  modeleReferenceId: z.string().nullable(),
  calendrier: calendrierPrevisionnelSchema,
});

export type PropositionCampagne = z.infer<typeof propositionCampagneSchema>;

export const filtrePropositionSchema = z.object({
  dateDebut: z.iso.date(),
});

export type FiltreProposition = z.infer<typeof filtrePropositionSchema>;

/** Plan d'une campagne existante : sa proposition si une culture du référentiel est choisie. */
export const planCampagneSchema = z.object({
  campagne: campagneSchema,
  proposition: propositionCampagneSchema.nullable(),
});

export type PlanCampagne = z.infer<typeof planCampagneSchema>;
