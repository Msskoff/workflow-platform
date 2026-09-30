import { HttpException, Injectable, Logger } from '@nestjs/common';
import { grapheWorkflowSchema, valeursVariablesSchema } from '@workflow/shared';
import { ExecutionsService } from '../executions/executions.service';
import { LancementService } from '../executions/lancement.service';
import type { TacheLot as LigneTache } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MESSAGE_SANS_CAMPAGNE } from './lots.service';

/** Délai avant la 1re relance automatique (doublé à chaque tentative). */
const DELAI_RELANCE_PAR_DEFAUT_MS = 10_000;

/** Message lisible d'une erreur Nest (détails de validation compris) ou d'une exception. */
function messageErreur({ erreur }: { erreur: unknown }): string {
  if (erreur instanceof HttpException) {
    const reponse = erreur.getResponse() as { message?: unknown; erreurs?: { message: string }[] };
    const details = reponse.erreurs?.map((detail) => detail.message).join(' ; ');
    return [typeof reponse.message === 'string' ? reponse.message : erreur.message, details]
      .filter(Boolean)
      .join(' : ');
  }
  return erreur instanceof Error ? erreur.message : String(erreur);
}

/**
 * Traitement de la file des lots (tâches en base). Chaque tâche crée une exécution du
 * graphe du lot sur la campagne de sa parcelle, puis la déroule.
 *
 * - Réservation atomique (`updateMany` conditionné au statut) : une tâche n'est prise qu'une fois.
 * - Échec d'exécution ou erreur imprévue : relance automatique après un délai croissant,
 *   jusqu'à `maxTentatives` ; au-delà, la tâche est « échouée » (relançable à la main).
 * - Erreur de préparation (variables invalides, pas de campagne) : échec définitif immédiat,
 *   une relance automatique donnerait le même résultat.
 * - Les tâches sont indépendantes : un échec ne bloque jamais les autres parcelles.
 */
@Injectable()
export class ExecuteurLots {
  private readonly journal = new Logger(ExecuteurLots.name);
  /** Lu à la construction : `LOTS_DELAI_RELANCE_MS=0` dans les tests. */
  private readonly delaiRelanceMs = Number(
    process.env.LOTS_DELAI_RELANCE_MS ?? DELAI_RELANCE_PAR_DEFAUT_MS,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly executions: ExecutionsService,
    private readonly lancement: LancementService,
  ) {}

  /**
   * Prend la prochaine tâche prête et la traite jusqu'au bout.
   * @returns `false` s'il n'y avait aucune tâche prête.
   */
  async traiterProchaine(): Promise<boolean> {
    const candidate = await this.prisma.tacheLot.findFirst({
      where: { statut: 'en_attente', prochaineTentativeLe: { lte: new Date() } },
      orderBy: [{ prochaineTentativeLe: 'asc' }, { creeLe: 'asc' }],
    });
    if (!candidate) {
      return false;
    }
    const reservation = await this.prisma.tacheLot.updateMany({
      where: { id: candidate.id, statut: 'en_attente' },
      data: {
        statut: 'en_cours',
        verrouilleeLe: new Date(),
        tentatives: { increment: 1 },
      },
    });
    if (reservation.count === 1) {
      await this.traiter({
        tache: { ...candidate, tentatives: candidate.tentatives + 1 },
      });
    }
    return true;
  }

  /** Vide la file des tâches prêtes (tests, traitements ponctuels). */
  async traiterTout(): Promise<void> {
    while (await this.traiterProchaine()) {
      // Chaque tour traite une tâche ; les relances immédiates sont reprises au tour suivant.
    }
  }

  /**
   * Au démarrage : les tâches restées « en cours » (arrêt brutal de l'API) repassent en file,
   * et leur exécution interrompue est marquée échouée.
   */
  async recupererInterrompues(): Promise<number> {
    const interrompues = await this.prisma.tacheLot.findMany({ where: { statut: 'en_cours' } });
    for (const tache of interrompues) {
      if (tache.executionId) {
        await this.prisma.executionWorkflow.updateMany({
          where: { id: tache.executionId, statut: { in: ['en_attente', 'en_cours'] } },
          data: { statut: 'echouee', erreur: 'Interrompue par un redémarrage de l’API' },
        });
      }
      await this.prisma.tacheLot.update({
        where: { id: tache.id },
        data: { statut: 'en_attente', verrouilleeLe: null, prochaineTentativeLe: new Date() },
      });
    }
    return interrompues.length;
  }

  private async traiter({ tache }: { tache: LigneTache }): Promise<void> {
    if (!tache.campagneId) {
      await this.echouer({ tache, message: MESSAGE_SANS_CAMPAGNE, definitif: true });
      return;
    }
    const lot = await this.prisma.lot.findUniqueOrThrow({ where: { id: tache.lotId } });
    const graphe = grapheWorkflowSchema.parse(lot.graphe);

    let executionId: string;
    try {
      const execution = await this.executions.creer({
        donnees: {
          campagneId: tache.campagneId,
          snapshot: {
            workflowId: lot.workflowId,
            nom: lot.modeleNom,
            version: 1,
            ...graphe,
            valeursVariables: {},
          },
          valeursVariables: valeursVariablesSchema.parse(lot.valeurs),
        },
      });
      executionId = execution.id;
    } catch (erreur) {
      await this.echouer({ tache, message: messageErreur({ erreur }), definitif: true });
      return;
    }

    await this.prisma.tacheLot.update({ where: { id: tache.id }, data: { executionId } });
    try {
      const fin = await this.lancement.executer({ id: executionId });
      if (fin.statut === 'terminee') {
        await this.prisma.tacheLot.update({
          where: { id: tache.id },
          data: { statut: 'reussie', erreur: null, termineeLe: new Date(), verrouilleeLe: null },
        });
        return;
      }
      await this.echouer({ tache, message: fin.erreur ?? 'Exécution échouée', definitif: false });
    } catch (erreur) {
      this.journal.error(`Tâche ${tache.id} : erreur imprévue`, erreur);
      await this.echouer({ tache, message: messageErreur({ erreur }), definitif: false });
    }
  }

  /** Relance espacée tant qu'il reste des tentatives, sinon échec (relançable à la main). */
  private async echouer({
    tache,
    message,
    definitif,
  }: {
    tache: LigneTache;
    message: string;
    definitif: boolean;
  }): Promise<void> {
    const relancer = !definitif && tache.tentatives < tache.maxTentatives;
    await this.prisma.tacheLot.update({
      where: { id: tache.id },
      data: relancer
        ? {
            statut: 'en_attente',
            erreur: message,
            verrouilleeLe: null,
            prochaineTentativeLe: new Date(
              Date.now() + this.delaiRelanceMs * 2 ** (tache.tentatives - 1),
            ),
          }
        : {
            statut: 'echouee',
            erreur: message,
            verrouilleeLe: null,
            prochaineTentativeLe: null,
            termineeLe: new Date(),
          },
    });
  }
}
