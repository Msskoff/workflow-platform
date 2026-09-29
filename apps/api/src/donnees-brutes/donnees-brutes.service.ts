import { Injectable } from '@nestjs/common';
import type { DonneeBrute, FiltreDonneesBrutes, ImporterDonneeBrute } from '@workflow/shared';
import { calculerEmpreinte } from '../common/empreinte';
import { introuvable } from '../common/erreurs';
import type { ServiceLecture } from '../common/service-crud';
import { PrismaService } from '../prisma/prisma.service';
import { versDonneeBrute } from './donnees-brutes.mapper';

/**
 * Données brutes : import et lecture uniquement.
 * Aucune méthode de modification ni de suppression, et la base le refuse aussi (triggers).
 */
@Injectable()
export class DonneesBrutesService implements ServiceLecture<DonneeBrute, FiltreDonneesBrutes> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreDonneesBrutes }): Promise<DonneeBrute[]> {
    const lignes = await this.prisma.donneeBrute.findMany({
      where: { campagneId: filtre.campagneId, type: filtre.type },
      orderBy: { importeeLe: 'asc' },
    });
    return lignes.map((ligne) => versDonneeBrute({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<DonneeBrute> {
    const ligne = await this.prisma.donneeBrute.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Donnée brute', id });
    }
    return versDonneeBrute({ ligne });
  }

  async importer({ donnees }: { donnees: ImporterDonneeBrute }): Promise<DonneeBrute> {
    const campagne = await this.prisma.campagne.findUnique({ where: { id: donnees.campagneId } });
    if (!campagne) {
      throw introuvable({ entite: 'Campagne', id: donnees.campagneId });
    }

    const ligne = await this.prisma.donneeBrute.create({
      data: {
        campagneId: donnees.campagneId,
        type: donnees.type,
        source: donnees.source,
        contenu: donnees.contenu,
        empreinte: calculerEmpreinte({ valeur: donnees.contenu }),
      },
    });
    return versDonneeBrute({ ligne });
  }
}
