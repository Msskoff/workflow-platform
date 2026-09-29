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

export const SNAPSHOT_TEST: WorkflowSnapshot = {
  workflowId: 'wf-irrigation',
  nom: 'Irrigation',
  version: 3,
  noeuds: [
    { id: 'collecte', type: 'collecte.formulaire', parametres: {} },
    { id: 'regle', type: 'decision.regle', parametres: { seuilHumidite: 20 } },
  ],
  connexions: [{ id: 'c1', source: 'collecte', cible: 'regle' }],
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

/** Crée une exécution du SNAPSHOT_TEST sur la campagne donnée. */
export function creerExecution({
  prisma,
  campagneId,
}: {
  prisma: PrismaService;
  campagneId: string;
}): Promise<ExecutionWorkflow> {
  return new ExecutionsService(prisma).creer({ donnees: { campagneId, snapshot: SNAPSHOT_TEST } });
}
