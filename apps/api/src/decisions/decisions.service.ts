import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  peutTransitionner,
  transitionsStatutDecision,
  type CreerDecision,
  type Decision,
  type ExecutionWorkflow,
  type FiltreDecisions,
  type ModifierDecision,
} from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { versExecutionWorkflow } from '../executions/executions.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { versDecision } from './decisions.mapper';

interface VerifierNoeudsParams {
  execution: ExecutionWorkflow;
  noeudIds: readonly string[];
}

@Injectable()
export class DecisionsService implements ServiceCrud<
  Decision,
  CreerDecision,
  ModifierDecision,
  FiltreDecisions
> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreDecisions }): Promise<Decision[]> {
    const lignes = await this.prisma.decision.findMany({
      where: { executionId: filtre.executionId, statut: filtre.statut },
      orderBy: { creeLe: 'asc' },
    });
    return lignes.map((ligne) => versDecision({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Decision> {
    const ligne = await this.prisma.decision.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Décision', id });
    }
    return versDecision({ ligne });
  }

  /** Toujours créée en `brouillon`, par une exécution non échouée, à partir de nœuds de son snapshot. */
  async creer({ donnees }: { donnees: CreerDecision }): Promise<Decision> {
    const execution = await this.chargerExecution({ id: donnees.executionId });
    if (execution.statut === 'echouee') {
      throw new ConflictException(
        `L'exécution ${execution.id} a échoué : elle ne peut pas produire de décision`,
      );
    }
    this.verifierNoeuds({ execution, noeudIds: donnees.noeudIds });

    const ligne = await this.prisma.decision.create({
      data: {
        executionId: donnees.executionId,
        noeudIds: donnees.noeudIds,
        explication: donnees.explication,
      },
    });
    return versDecision({ ligne });
  }

  /**
   * Le contenu (explication, nœuds) n'est modifiable qu'en `brouillon`.
   * Le statut avance selon `transitionsStatutDecision` ; les dates sont posées par l'API.
   */
  async modifier({ id, donnees }: { id: string; donnees: ModifierDecision }): Promise<Decision> {
    const actuelle = await this.trouver({ id });
    const { explication, noeudIds, statut } = donnees;

    if ((explication !== undefined || noeudIds !== undefined) && actuelle.statut !== 'brouillon') {
      throw new ConflictException(
        `La décision ${id} est « ${actuelle.statut} » : son contenu n'est plus modifiable`,
      );
    }
    if (noeudIds !== undefined) {
      const execution = await this.chargerExecution({ id: actuelle.executionId });
      this.verifierNoeuds({ execution, noeudIds });
    }
    const changeDeStatut = statut !== undefined && statut !== actuelle.statut;
    if (
      changeDeStatut &&
      !peutTransitionner({
        transitions: transitionsStatutDecision,
        depuis: actuelle.statut,
        vers: statut,
      })
    ) {
      throw new ConflictException(
        `Transition de statut interdite : ${actuelle.statut} → ${statut}`,
      );
    }

    const maintenant = new Date();
    const ligne = await this.prisma.decision.update({
      where: { id },
      data: {
        explication,
        noeudIds,
        ...(changeDeStatut && { statut }),
        ...(changeDeStatut && statut === 'validé' && { valideeLe: maintenant }),
        ...(changeDeStatut && statut === 'envoyé' && { envoyeeLe: maintenant }),
      },
    });
    return versDecision({ ligne });
  }

  /** Seul un brouillon peut être supprimé : une décision validée ou envoyée reste tracée. */
  async supprimer({ id }: { id: string }): Promise<void> {
    const actuelle = await this.trouver({ id });
    if (actuelle.statut !== 'brouillon') {
      throw new ConflictException(
        `La décision ${id} est « ${actuelle.statut} » : seul un brouillon peut être supprimé`,
      );
    }
    await this.prisma.decision.delete({ where: { id } });
  }

  private async chargerExecution({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const ligne = await this.prisma.executionWorkflow.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Exécution', id });
    }
    return versExecutionWorkflow({ ligne });
  }

  /** Traçabilité : chaque nœud cité doit exister dans le snapshot de l'exécution. */
  private verifierNoeuds({ execution, noeudIds }: VerifierNoeudsParams): void {
    const connus = new Set(execution.snapshot.noeuds.map((noeud) => noeud.id));
    const inconnus = noeudIds.filter((noeudId) => !connus.has(noeudId));
    if (inconnus.length > 0) {
      throw new BadRequestException(
        `Nœuds absents du snapshot de l'exécution ${execution.id} : ${inconnus.join(', ')}`,
      );
    }
  }
}
