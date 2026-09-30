import { z } from 'zod';
import { carteParcelleSchema } from './carte';
import { horodatageSchema } from './commun';
import { devisSchema } from './devis';
import { indicateursSchema } from './indicateurs';

/**
 * Contenu d'un rapport de parcelle, figé par le nœud « Rapport PDF » lors de l'exécution.
 * Le PDF est généré à la demande à partir de ce contenu et des décisions validées
 * (ou envoyées, côté client) de la même exécution.
 */
export const rapportParcelleSchema = z.object({
  titre: z.string().min(1),
  introduction: z.string(),
  /** Nombre de décisions présentées dans le PDF (les plus prioritaires). */
  nombreMaxDecisions: z.int().min(3).max(5),
  genereLe: horodatageSchema,
  surfaceHa: z.number().nonnegative().nullable(),
  carte: carteParcelleSchema,
  indicateurs: indicateursSchema,
  devis: devisSchema.nullable(),
  /** Nombre de règles déclenchées lors de l'exécution (décisions à revoir). */
  decisionsProposees: z.int().nonnegative(),
});

export type RapportParcelle = z.infer<typeof rapportParcelleSchema>;
