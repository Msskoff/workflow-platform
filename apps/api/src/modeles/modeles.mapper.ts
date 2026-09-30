import { modeleWorkflowSchema, type ModeleWorkflow, type ResumeModele } from '@workflow/shared';
import type { ModeleWorkflow as ModeleLigne } from '../generated/prisma/client';

/** Relation à inclure pour connaître le nom de la culture d'un modèle. */
export const INCLURE_CULTURE = { culture: { select: { id: true, nom: true } } } as const;

interface VersModeleParams {
  ligne: ModeleLigne & { culture: { id: string; nom: string } | null };
}

/** Ligne Prisma → modèle partagé (graphe et paramètres JSON revalidés). */
export function versModele({ ligne }: VersModeleParams): ModeleWorkflow {
  return modeleWorkflowSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}

/** Modèle → entrée de liste, sans le graphe. */
export function versResume({ modele }: { modele: ModeleWorkflow }): ResumeModele {
  const { graphe, ...resume } = modele;
  return { ...resume, nombreNoeuds: graphe.noeuds.length };
}
