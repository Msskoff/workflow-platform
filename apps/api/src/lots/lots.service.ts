import { BadRequestException, Injectable } from '@nestjs/common';
import {
  preparerValeursVariables,
  type CreerLot,
  type Lot,
  type ResumeLot,
  type ValeursVariables,
} from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import { ModelesService } from '../modeles/modeles.service';
import { PrismaService } from '../prisma/prisma.service';
import { INCLURE_TACHES, versLot, versResumeLot } from './lots.mapper';

/** Erreur définitive d'une parcelle sans campagne : rien à relancer tant qu'elle n'en a pas. */
export const MESSAGE_SANS_CAMPAGNE =
  'Aucune campagne sur cette parcelle : créez-en une, puis relancez les échecs du lot';

/**
 * Lots d'exécution : création (une tâche par parcelle, sur sa campagne la plus récente),
 * consultation et relance des échecs. Le traitement de la file est fait par `ExecuteurLots`.
 */
@Injectable()
export class LotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modeles: ModelesService,
  ) {}

  async lister(): Promise<ResumeLot[]> {
    const lignes = await this.prisma.lot.findMany({
      include: INCLURE_TACHES,
      orderBy: { creeLe: 'desc' },
    });
    return lignes.map((ligne) => versResumeLot({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Lot> {
    const ligne = await this.prisma.lot.findUnique({ where: { id }, include: INCLURE_TACHES });
    if (!ligne) {
      throw introuvable({ entite: 'Lot', id });
    }
    return versLot({ ligne });
  }

  /**
   * Les valeurs communes sont vérifiées avant toute création : un lot ne démarre pas si
   * une variable obligatoire manque. Les variables `parcelle` sont remplies par tâche.
   */
  async creer({ donnees }: { donnees: CreerLot }): Promise<Lot> {
    const modele = await this.modeles.trouver({ id: donnees.modeleId });
    const { variables } = modele.graphe;
    const parTache = new Set(variables.filter((v) => v.type === 'parcelle').map((v) => v.nom));
    const communes: ValeursVariables = Object.fromEntries(
      Object.entries(donnees.valeurs).filter(([nom]) => !parTache.has(nom)),
    );
    const { erreurs } = preparerValeursVariables({
      variables,
      fournies: communes,
      parcelleId: 'verification',
    });
    if (erreurs.length > 0) {
      throw new BadRequestException({
        message: 'Valeurs des variables invalides',
        erreurs: erreurs.map((message) => ({ code: 'variable_invalide', message })),
      });
    }

    const parcelles = await this.prisma.parcelle.findMany({
      where: { id: { in: donnees.parcelleIds } },
      include: { campagnes: { orderBy: [{ dateDebut: 'desc' }, { creeLe: 'desc' }], take: 1 } },
    });
    const trouvees = new Set(parcelles.map((parcelle) => parcelle.id));
    const absentes = donnees.parcelleIds.filter((id) => !trouvees.has(id));
    if (absentes.length > 0) {
      throw introuvable({ entite: 'Parcelle', id: absentes.join(', ') });
    }

    const maintenant = new Date();
    const ligne = await this.prisma.lot.create({
      data: {
        nom:
          donnees.nom ??
          `${modele.nom} · ${parcelles.length} parcelle(s) · ${maintenant.toLocaleDateString('fr-FR')}`,
        modeleId: modele.id,
        modeleNom: modele.nom,
        workflowId: `modele-${modele.code ?? modele.id}`,
        graphe: modele.graphe,
        valeurs: communes,
        taches: {
          create: donnees.parcelleIds.map((parcelleId) => {
            const campagne = parcelles.find((parcelle) => parcelle.id === parcelleId)?.campagnes[0];
            return campagne
              ? { parcelleId, campagneId: campagne.id }
              : {
                  parcelleId,
                  statut: 'echouee',
                  erreur: MESSAGE_SANS_CAMPAGNE,
                  prochaineTentativeLe: null,
                  termineeLe: maintenant,
                };
          }),
        },
      },
      include: INCLURE_TACHES,
    });
    return versLot({ ligne });
  }

  /**
   * Remet en file les tâches échouées, compteur de tentatives remis à zéro. La campagne est
   * recherchée à nouveau pour les parcelles qui n'en avaient pas.
   */
  async relancerEchecs({ id }: { id: string }): Promise<Lot> {
    const lot = await this.trouver({ id });
    for (const tache of lot.taches.filter((candidate) => candidate.statut === 'echouee')) {
      const campagneId =
        tache.campagne?.id ??
        (
          await this.prisma.campagne.findFirst({
            where: { parcelleId: tache.parcelle.id },
            orderBy: [{ dateDebut: 'desc' }, { creeLe: 'desc' }],
          })
        )?.id ??
        null;
      await this.prisma.tacheLot.update({
        where: { id: tache.id },
        data: campagneId
          ? {
              campagneId,
              statut: 'en_attente',
              tentatives: 0,
              erreur: null,
              prochaineTentativeLe: new Date(),
              termineeLe: null,
              verrouilleeLe: null,
            }
          : { erreur: MESSAGE_SANS_CAMPAGNE, termineeLe: new Date() },
      });
    }
    return this.trouver({ id });
  }
}
