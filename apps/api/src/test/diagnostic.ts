import type { ExecutionWorkflow, WorkflowSnapshot } from '@workflow/shared';
import { LancementService } from '../executions/lancement.service';
import { DIAGNOSTIC_INITIAL_PARCELLE } from '../modeles/modeles-predefinis';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import type { PrismaService } from '../prisma/prisma.service';
import { creerExecution, creerExecutionsService } from './jeu-de-donnees';
import { lireExemple, lireExempleBase64 } from './noeuds';

/** Snapshot du modèle « Diagnostic initial parcelle » avec le contour et l'image d'exemple. */
export function snapshotDiagnostic({
  image = 'sentinel2-parcelle.tif',
}: { image?: string } = {}): WorkflowSnapshot {
  const donneesExemple: Record<string, Record<string, string>> = {
    import_gps: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
    ndvi: { image: lireExempleBase64({ nom: image }) },
  };
  return {
    workflowId: DIAGNOSTIC_INITIAL_PARCELLE.code,
    nom: DIAGNOSTIC_INITIAL_PARCELLE.nom,
    version: 1,
    variables: [],
    valeursVariables: {},
    connexions: DIAGNOSTIC_INITIAL_PARCELLE.graphe.connexions,
    noeuds: DIAGNOSTIC_INITIAL_PARCELLE.graphe.noeuds.map((noeud) => ({
      ...noeud,
      parametres: { ...noeud.parametres, ...donneesExemple[noeud.id] },
    })),
  };
}

/** Crée et exécute jusqu'au bout le diagnostic sur une campagne ; renvoie l'exécution terminée. */
export async function executerDiagnostic({
  prisma,
  campagneId,
  image,
}: {
  prisma: PrismaService;
  campagneId: string;
  image?: string;
}): Promise<ExecutionWorkflow> {
  const { id } = await creerExecution({
    prisma,
    campagneId,
    snapshot: snapshotDiagnostic({ image }),
  });
  const lancement = new LancementService(
    prisma,
    creerRegistreNoeuds(),
    creerExecutionsService({ prisma }),
  );
  return lancement.executer({ id });
}
