import { BadRequestException, Injectable } from '@nestjs/common';
import {
  datesCampagneCoherentes,
  MESSAGE_DATES_INCOHERENTES,
  type Campagne,
  type CreerCampagne,
  type FiltreCampagnes,
  type ModifierCampagne,
} from '@workflow/shared';
import { executerSansConflit, introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { PrismaService } from '../prisma/prisma.service';
import { versCampagne } from './campagnes.mapper';

@Injectable()
export class CampagnesService implements ServiceCrud<
  Campagne,
  CreerCampagne,
  ModifierCampagne,
  FiltreCampagnes
> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreCampagnes }): Promise<Campagne[]> {
    const lignes = await this.prisma.campagne.findMany({
      where: { parcelleId: filtre.parcelleId },
      orderBy: { dateDebut: 'desc' },
    });
    return lignes.map((ligne) => versCampagne({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Campagne> {
    const ligne = await this.prisma.campagne.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Campagne', id });
    }
    return versCampagne({ ligne });
  }

  async creer({ donnees }: { donnees: CreerCampagne }): Promise<Campagne> {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: donnees.parcelleId } });
    if (!parcelle) {
      throw introuvable({ entite: 'Parcelle', id: donnees.parcelleId });
    }

    const ligne = await this.prisma.campagne.create({ data: donnees });
    return versCampagne({ ligne });
  }

  /** Les dates sont revérifiées après fusion avec l'existant (modification partielle). */
  async modifier({ id, donnees }: { id: string; donnees: ModifierCampagne }): Promise<Campagne> {
    const actuelle = await this.trouver({ id });
    const dateDebut = donnees.dateDebut ?? actuelle.dateDebut;
    const dateFin = donnees.dateFin === undefined ? actuelle.dateFin : donnees.dateFin;
    if (!datesCampagneCoherentes({ dateDebut, dateFin })) {
      throw new BadRequestException(MESSAGE_DATES_INCOHERENTES);
    }

    const ligne = await this.prisma.campagne.update({ where: { id }, data: donnees });
    return versCampagne({ ligne });
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.trouver({ id });
    await executerSansConflit({
      operation: () => this.prisma.campagne.delete({ where: { id } }),
      messageConflit: `La campagne ${id} possède des données brutes ou des exécutions : elle ne peut pas être supprimée`,
    });
  }
}
