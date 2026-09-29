import { Injectable } from '@nestjs/common';
import {
  calculerSurfaceHa,
  type CreerParcelle,
  type FiltreParcelles,
  type ModifierParcelle,
  type Parcelle,
} from '@workflow/shared';
import { executerSansConflit, introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { PrismaService } from '../prisma/prisma.service';
import { versParcelle } from './parcelles.mapper';

@Injectable()
export class ParcellesService implements ServiceCrud<
  Parcelle,
  CreerParcelle,
  ModifierParcelle,
  FiltreParcelles
> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreParcelles }): Promise<Parcelle[]> {
    const lignes = await this.prisma.parcelle.findMany({
      where: { clientId: filtre.clientId },
      orderBy: { nom: 'asc' },
    });
    return lignes.map((ligne) => versParcelle({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Parcelle> {
    const ligne = await this.prisma.parcelle.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Parcelle', id });
    }
    return versParcelle({ ligne });
  }

  /** La surface est toujours calculée à partir de la géométrie, jamais saisie. */
  async creer({ donnees }: { donnees: CreerParcelle }): Promise<Parcelle> {
    const client = await this.prisma.client.findUnique({ where: { id: donnees.clientId } });
    if (!client) {
      throw introuvable({ entite: 'Client', id: donnees.clientId });
    }

    const ligne = await this.prisma.parcelle.create({
      data: {
        clientId: donnees.clientId,
        nom: donnees.nom,
        geometrie: donnees.geometrie,
        surfaceHa: calculerSurfaceHa({ geometrie: donnees.geometrie }),
      },
    });
    return versParcelle({ ligne });
  }

  async modifier({ id, donnees }: { id: string; donnees: ModifierParcelle }): Promise<Parcelle> {
    await this.trouver({ id });
    const ligne = await this.prisma.parcelle.update({
      where: { id },
      data: {
        nom: donnees.nom,
        ...(donnees.geometrie && {
          geometrie: donnees.geometrie,
          surfaceHa: calculerSurfaceHa({ geometrie: donnees.geometrie }),
        }),
      },
    });
    return versParcelle({ ligne });
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.trouver({ id });
    await executerSansConflit({
      operation: () => this.prisma.parcelle.delete({ where: { id } }),
      messageConflit: `La parcelle ${id} possède des campagnes : supprimez-les d'abord`,
    });
  }
}
