import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  peutTransitionner,
  preparerValeursVariables,
  resoudreParametres,
  transitionsStatutExecution,
  type CreerExecutionWorkflow,
  type ExecutionWorkflow,
  type FiltreExecutions,
  type ModifierExecutionWorkflow,
  type StatutExecution,
  type ValeursVariables,
  type WorkflowSnapshot,
} from '@workflow/shared';
import { calculerEmpreinte } from '../common/empreinte';
import { executerSansConflit, introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { validerWorkflowComplet } from '../moteur/valider-workflow';
import { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { PrismaService } from '../prisma/prisma.service';
import { INCLURE_ETATS_NOEUDS, versExecutionWorkflow } from './executions.mapper';

const STATUTS_FINAUX: readonly StatutExecution[] = ['terminee', 'echouee'];

@Injectable()
export class ExecutionsService implements ServiceCrud<
  ExecutionWorkflow,
  CreerExecutionWorkflow,
  ModifierExecutionWorkflow,
  FiltreExecutions
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registre: RegistreNoeuds,
  ) {}

  async lister({ filtre }: { filtre: FiltreExecutions }): Promise<ExecutionWorkflow[]> {
    const lignes = await this.prisma.executionWorkflow.findMany({
      where: {
        campagneId: filtre.campagneId,
        workflowId: filtre.workflowId,
        statut: filtre.statut,
      },
      include: INCLURE_ETATS_NOEUDS,
      orderBy: [{ creeLe: 'desc' }, { version: 'desc' }],
    });
    return lignes.map((ligne) => versExecutionWorkflow({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const ligne = await this.prisma.executionWorkflow.findUnique({
      where: { id },
      include: INCLURE_ETATS_NOEUDS,
    });
    if (!ligne) {
      throw introuvable({ entite: 'Exécution', id });
    }
    return versExecutionWorkflow({ ligne });
  }

  /**
   * Crée l'exécution en `en_attente` avec la version suivante pour ce couple
   * (campagne, workflow), et un état `en_attente` par nœud. Le snapshot doit être
   * exécutable (types compatibles, sans cycle, paramètres valides) ; il est figé ensuite.
   */
  /**
   * Les références `${nom}` du snapshot sont résolues avec les valeurs fournies (sinon valeurs par
   * défaut, parcelle de la campagne) ; le snapshot enregistré est le graphe résolu, validé
   * en entier, avec les valeurs utilisées.
   */
  async creer({ donnees }: { donnees: CreerExecutionWorkflow }): Promise<ExecutionWorkflow> {
    const { campagneId } = donnees;
    const campagne = await this.prisma.campagne.findUnique({ where: { id: campagneId } });
    if (!campagne) {
      throw introuvable({ entite: 'Campagne', id: campagneId });
    }

    const structure = validerWorkflowComplet({ graphe: donnees.snapshot, registre: this.registre });
    if (structure.length > 0) {
      throw new BadRequestException({ message: 'Workflow invalide', erreurs: structure });
    }
    const snapshot = ExecutionsService.resoudre({
      snapshot: donnees.snapshot,
      fournies: donnees.valeursVariables,
      parcelleId: campagne.parcelleId,
    });
    const erreurs = validerWorkflowComplet({ graphe: snapshot, registre: this.registre });
    if (erreurs.length > 0) {
      throw new BadRequestException({ message: 'Workflow invalide', erreurs });
    }

    const ligne = await this.prisma.$transaction(async (transaction) => {
      const derniere = await transaction.executionWorkflow.aggregate({
        where: { campagneId, workflowId: snapshot.workflowId },
        _max: { version: true },
      });
      return transaction.executionWorkflow.create({
        data: {
          campagneId,
          workflowId: snapshot.workflowId,
          version: (derniere._max.version ?? 0) + 1,
          snapshot,
          empreinteSnapshot: calculerEmpreinte({ valeur: snapshot }),
          noeuds: { create: snapshot.noeuds.map((noeud) => ({ noeudId: noeud.id })) },
        },
        include: INCLURE_ETATS_NOEUDS,
      });
    });
    return versExecutionWorkflow({ ligne });
  }

  /** Seul le statut évolue, selon `transitionsStatutExecution`. Les dates sont posées par l'API. */
  /** Valeurs des variables puis paramètres résolus ; 400 si une variable manque ou est mal typée. */
  private static resoudre({
    snapshot,
    fournies,
    parcelleId,
  }: {
    snapshot: WorkflowSnapshot;
    fournies?: ValeursVariables;
    parcelleId: string;
  }): WorkflowSnapshot {
    if (snapshot.variables.length === 0) {
      return snapshot;
    }
    const { valeurs, erreurs } = preparerValeursVariables({
      variables: snapshot.variables,
      fournies,
      parcelleId,
    });
    if (erreurs.length > 0) {
      throw new BadRequestException({
        message: 'Variables du workflow invalides',
        erreurs: erreurs.map((message) => ({ code: 'variable_invalide', message })),
      });
    }
    // Les fichiers restent dans les paramètres résolus ; seule leur taille est tracée.
    const fichiers = new Set(
      snapshot.variables.filter((variable) => variable.type === 'fichier').map(({ nom }) => nom),
    );
    return {
      ...snapshot,
      noeuds: resoudreParametres({ noeuds: snapshot.noeuds, valeurs }),
      valeursVariables: Object.fromEntries(
        Object.entries(valeurs).map(([nom, valeur]) => [
          nom,
          fichiers.has(nom)
            ? `[fichier de ${Math.round((String(valeur).length * 0.75) / 1024)} Ko]`
            : valeur,
        ]),
      ),
    };
  }

  async modifier({
    id,
    donnees,
  }: {
    id: string;
    donnees: ModifierExecutionWorkflow;
  }): Promise<ExecutionWorkflow> {
    const actuelle = await this.trouver({ id });
    const { statut, erreur } = donnees;

    if (erreur !== undefined && statut !== 'echouee') {
      throw new BadRequestException("Le champ `erreur` n'est accepté que pour le statut `echouee`");
    }
    if (
      !peutTransitionner({
        transitions: transitionsStatutExecution,
        depuis: actuelle.statut,
        vers: statut,
      })
    ) {
      throw new ConflictException(
        `Transition de statut interdite : ${actuelle.statut} → ${statut}`,
      );
    }

    const maintenant = new Date();
    const ligne = await this.prisma.executionWorkflow.update({
      where: { id },
      data: {
        statut,
        erreur: erreur ?? null,
        ...(statut === 'en_cours' && { demarreeLe: maintenant }),
        ...(STATUTS_FINAUX.includes(statut) && { termineeLe: maintenant }),
      },
      include: INCLURE_ETATS_NOEUDS,
    });
    return versExecutionWorkflow({ ligne });
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.trouver({ id });
    await executerSansConflit({
      operation: () => this.prisma.executionWorkflow.delete({ where: { id } }),
      messageConflit: `L'exécution ${id} a produit des décisions : elle ne peut pas être supprimée`,
    });
  }
}
