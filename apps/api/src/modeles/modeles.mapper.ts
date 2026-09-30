import { modeleWorkflowSchema, type ModeleWorkflow, type ResumeModele } from '@workflow/shared';
import type { ModeleWorkflow as ModeleLigne } from '../generated/prisma/client';

/** Ligne Prisma → modèle partagé (le graphe JSON est revalidé). */
export function versModele({ ligne }: { ligne: ModeleLigne }): ModeleWorkflow {
  return modeleWorkflowSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}

/** Modèle → entrée de liste, sans le graphe. */
export function versResume({ modele }: { modele: ModeleWorkflow }): ResumeModele {
  return {
    id: modele.id,
    code: modele.code,
    nom: modele.nom,
    description: modele.description,
    predefini: modele.predefini,
    nombreNoeuds: modele.graphe.noeuds.length,
    creeLe: modele.creeLe,
    modifieLe: modele.modifieLe,
  };
}
