import {
  executionWorkflowSchema,
  workflowSnapshotSchema,
  type ExecutionWorkflow,
} from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import type { Prisma } from '../generated/prisma/client';

/** À passer en `include` de toute requête dont le résultat est converti par `versExecutionWorkflow`. */
export const INCLURE_ETATS_NOEUDS = { noeuds: true } as const;

export type ExecutionWorkflowLigne = Prisma.ExecutionWorkflowGetPayload<{
  include: typeof INCLURE_ETATS_NOEUDS;
}>;

interface VersExecutionWorkflowParams {
  ligne: ExecutionWorkflowLigne;
}

/** Ligne Prisma → entité partagée. Les états des nœuds suivent l'ordre du snapshot. */
export function versExecutionWorkflow({ ligne }: VersExecutionWorkflowParams): ExecutionWorkflow {
  const snapshot = workflowSnapshotSchema.parse(ligne.snapshot);
  const rang = new Map(snapshot.noeuds.map((noeud, index) => [noeud.id, index]));
  const noeuds = [...ligne.noeuds]
    .sort((a, b) => (rang.get(a.noeudId) ?? 0) - (rang.get(b.noeudId) ?? 0))
    .map((etat) => ({
      noeudId: etat.noeudId,
      statut: etat.statut,
      sorties: etat.sorties,
      erreur: etat.erreur,
      demarreLe: enIsoOuNull({ date: etat.demarreLe }),
      termineLe: enIsoOuNull({ date: etat.termineLe }),
    }));

  return executionWorkflowSchema.parse({
    ...ligne,
    snapshot,
    noeuds,
    demarreeLe: enIsoOuNull({ date: ligne.demarreeLe }),
    termineeLe: enIsoOuNull({ date: ligne.termineeLe }),
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
