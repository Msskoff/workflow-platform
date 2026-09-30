import type {
  Campagne,
  Client,
  ExecutionWorkflow,
  GeometrieParcelle,
  Parcelle,
  WorkflowSnapshot,
} from '@workflow/shared';
import { CampagnesService } from '../campagnes/campagnes.service';
import { ClientsService } from '../clients/clients.service';
import { ExecutionsService } from '../executions/executions.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { ParcellesService } from '../parcelles/parcelles.service';
import type { PrismaService } from '../prisma/prisma.service';

/** Carré de 0,01° (≈ 123,6 ha) à l'équateur. */
export const GEOMETRIE_TEST: GeometrieParcelle = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
      [0, 0],
    ],
  ],
};

/** `mesure` (nombre 25) → `regle` (seuil 20), sans attente simulée. */
export const SNAPSHOT_TEST: WorkflowSnapshot = {
  workflowId: 'wf-irrigation',
  nom: 'Irrigation',
  version: 3,
  noeuds: [
    { id: 'mesure', type: 'factice.nombre', parametres: { valeur: 25, dureeMs: 0 } },
    { id: 'regle', type: 'factice.seuil', parametres: { seuil: 20, dureeMs: 0 } },
  ],
  connexions: [
    { id: 'c1', source: 'mesure', sourcePort: 'nombre', cible: 'regle', ciblePort: 'valeur' },
  ],
};

export interface JeuDeDonnees {
  client: Client;
  parcelle: Parcelle;
  campagne: Campagne;
}

/** Crée la chaîne Client → Parcelle → Campagne via les services. */
export async function creerJeuDeDonnees({
  prisma,
}: {
  prisma: PrismaService;
}): Promise<JeuDeDonnees> {
  const client = await new ClientsService(prisma).creer({ donnees: { nom: 'EARL des Tilleuls' } });
  const parcelle = await new ParcellesService(prisma).creer({
    donnees: { clientId: client.id, nom: 'Les Grands Champs', geometrie: GEOMETRIE_TEST },
  });
  const campagne = await new CampagnesService(prisma).creer({
    donnees: { parcelleId: parcelle.id, nom: 'Blé 2026', culture: 'blé', dateDebut: '2025-10-15' },
  });
  return { client, parcelle, campagne };
}

/** Service d'exécutions branché sur le registre de nœuds réel. */
export function creerExecutionsService({ prisma }: { prisma: PrismaService }): ExecutionsService {
  return new ExecutionsService(prisma, creerRegistreNoeuds());
}

/** Crée une exécution (par défaut du SNAPSHOT_TEST) sur la campagne donnée. */
export function creerExecution({
  prisma,
  campagneId,
  snapshot = SNAPSHOT_TEST,
}: {
  prisma: PrismaService;
  campagneId: string;
  snapshot?: WorkflowSnapshot;
}): Promise<ExecutionWorkflow> {
  return creerExecutionsService({ prisma }).creer({ donnees: { campagneId, snapshot } });
}
