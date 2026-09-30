import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { creerDecisionSchema, type ExecutionWorkflow, type StatutNoeud } from '@workflow/shared';
import { extraireDecisions } from '../moteur/extraire-decisions';
import {
  executerWorkflow,
  type ObservateurExecution,
  type ValeursParPort,
} from '../moteur/moteur-execution';
import { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionsService } from './executions.service';

interface MiseAJourEtatNoeud {
  statut: StatutNoeud;
  sorties?: ValeursParPort;
  erreur?: string;
  demarreLe?: Date;
  termineLe?: Date;
}

/**
 * Fait tourner le moteur sur une exécution et enregistre au fil de l'eau l'état de
 * chaque nœud (`en_attente → en_cours → ok | erreur`), que le front lit par polling.
 * En fin d'exécution réussie, les décisions des règles métier sont créées en brouillon.
 */
@Injectable()
export class LancementService {
  private readonly journal = new Logger(LancementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registre: RegistreNoeuds,
    private readonly executions: ExecutionsService,
  ) {}

  /** Démarre l'exécution en tâche de fond et rend la main aussitôt (statut `en_cours`). */
  async lancer({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const demarree = await this.demarrer({ id });
    void this.derouler({ execution: demarree }).catch((erreur: unknown) =>
      this.journal.error(`Exécution ${id} interrompue`, erreur),
    );
    return demarree;
  }

  /** Démarre l'exécution et attend sa fin. Utilisé par les tests et les traitements par lot. */
  async executer({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const demarree = await this.demarrer({ id });
    await this.derouler({ execution: demarree });
    return this.executions.trouver({ id });
  }

  private async demarrer({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const execution = await this.executions.trouver({ id });
    if (execution.statut !== 'en_attente') {
      throw new ConflictException(
        `L'exécution ${id} est « ${execution.statut} » : seule une exécution en attente peut être lancée`,
      );
    }
    return this.executions.modifier({ id, donnees: { statut: 'en_cours' } });
  }

  private async derouler({ execution }: { execution: ExecutionWorkflow }): Promise<void> {
    const { id, campagneId, snapshot } = execution;
    try {
      const resultat = await executerWorkflow({
        graphe: snapshot,
        registre: this.registre,
        contexte: { executionId: id, campagneId },
        observateur: this.observateur({ executionId: id }),
      });
      if (resultat.statut === 'ok') {
        await this.enregistrerDecisions({ execution, sorties: resultat.sorties });
      }
      await this.executions.modifier({
        id,
        donnees:
          resultat.statut === 'ok'
            ? { statut: 'terminee' }
            : { statut: 'echouee', erreur: `${resultat.noeudId} : ${resultat.erreur}` },
      });
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      await this.executions.modifier({ id, donnees: { statut: 'echouee', erreur: message } });
    }
  }

  /**
   * Enregistre en brouillon les décisions des règles déclenchées. Seulement après une
   * exécution réussie : une exécution échouée ne produit aucune décision.
   */
  private async enregistrerDecisions({
    execution,
    sorties,
  }: {
    execution: ExecutionWorkflow;
    sorties: Record<string, ValeursParPort>;
  }): Promise<void> {
    const decisions = extraireDecisions({
      graphe: execution.snapshot,
      registre: this.registre,
      sorties,
    });
    if (decisions.length === 0) {
      return;
    }
    await this.prisma.decision.createMany({
      data: decisions.map((decision) => {
        const valide = creerDecisionSchema.parse({ executionId: execution.id, ...decision });
        return {
          executionId: valide.executionId,
          noeudIds: valide.noeudIds,
          explication: valide.explication,
          recommandation: valide.recommandation ?? null,
          priorite: valide.priorite ?? null,
          donnees: decision.donnees,
        };
      }),
    });
  }

  /** Observateur qui enregistre chaque changement d'état de nœud en base. */
  private observateur({ executionId }: { executionId: string }): ObservateurExecution {
    const mettreAJour = ({ noeudId, etat }: { noeudId: string; etat: MiseAJourEtatNoeud }) =>
      this.prisma.executionNoeud
        .update({ where: { executionId_noeudId: { executionId, noeudId } }, data: etat })
        .then(() => undefined);

    return {
      noeudDemarre: ({ noeudId }) =>
        mettreAJour({ noeudId, etat: { statut: 'en_cours', demarreLe: new Date() } }),
      noeudTermine: ({ noeudId, sorties }) =>
        mettreAJour({ noeudId, etat: { statut: 'ok', sorties, termineLe: new Date() } }),
      noeudEchoue: ({ noeudId, erreur }) =>
        mettreAJour({ noeudId, etat: { statut: 'erreur', erreur, termineLe: new Date() } }),
    };
  }
}
