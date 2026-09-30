import { Injectable } from '@nestjs/common';
import {
  decisionEnRevueSchema,
  workflowSnapshotSchema,
  type DecisionEnRevue,
  type FiltreRevue,
} from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { PrismaService } from '../prisma/prisma.service';
import { versDecision } from './decisions.mapper';

const INCLURE_CONTEXTE = {
  execution: { include: { campagne: { include: { parcelle: { include: { client: true } } } } } },
} as const;

/**
 * Lecture des décisions pour l'écran de revue interne : chaque décision avec son client,
 * sa parcelle, sa campagne, l'exécution qui l'a produite et la chaîne des nœuds nommés.
 */
@Injectable()
export class RevueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registre: RegistreNoeuds,
  ) {}

  async lister({ filtre }: { filtre: FiltreRevue }): Promise<DecisionEnRevue[]> {
    const lignes = await this.prisma.decision.findMany({
      where: {
        statut: filtre.statut,
        ...(filtre.clientId && {
          execution: { campagne: { parcelle: { clientId: filtre.clientId } } },
        }),
      },
      include: INCLURE_CONTEXTE,
      orderBy: [{ creeLe: 'desc' }],
    });

    return lignes.map(({ execution, ...ligne }) => {
      const decision = versDecision({ ligne });
      const snapshot = workflowSnapshotSchema.parse(execution.snapshot);
      const { campagne } = execution;
      const { parcelle } = campagne;
      return decisionEnRevueSchema.parse({
        decision,
        execution: {
          id: execution.id,
          version: execution.version,
          workflowNom: snapshot.nom,
          termineeLe: enIsoOuNull({ date: execution.termineeLe }),
        },
        campagne: { id: campagne.id, nom: campagne.nom },
        parcelle: { id: parcelle.id, nom: parcelle.nom, surfaceHa: parcelle.surfaceHa },
        client: { id: parcelle.client.id, nom: parcelle.client.nom },
        chaine: decision.noeudIds.map((noeudId) => {
          const type = snapshot.noeuds.find((noeud) => noeud.id === noeudId)?.type ?? '';
          return { noeudId, type, libelle: this.registre.obtenir({ type })?.libelle ?? type };
        }),
      });
    });
  }
}
