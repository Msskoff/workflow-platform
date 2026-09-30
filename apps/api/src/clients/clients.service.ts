import { Injectable } from '@nestjs/common';
import type {
  AccesClient,
  Client,
  CreerClient,
  FiltreClients,
  ModifierClient,
} from '@workflow/shared';
import { executerSansConflit, introuvable } from '../common/erreurs';
import { empreinteJeton, genererJeton } from '../common/jeton';
import type { ServiceCrud } from '../common/service-crud';
import { PrismaService } from '../prisma/prisma.service';
import { versClient } from './clients.mapper';

@Injectable()
export class ClientsService implements ServiceCrud<
  Client,
  CreerClient,
  ModifierClient,
  FiltreClients
> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreClients }): Promise<Client[]> {
    const lignes = await this.prisma.client.findMany({
      where: filtre.nom ? { nom: { contains: filtre.nom } } : {},
      orderBy: { nom: 'asc' },
    });
    return lignes.map((ligne) => versClient({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Client> {
    const ligne = await this.prisma.client.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Client', id });
    }
    return versClient({ ligne });
  }

  async creer({ donnees }: { donnees: CreerClient }): Promise<Client> {
    const ligne = await this.prisma.client.create({ data: donnees });
    return versClient({ ligne });
  }

  async modifier({ id, donnees }: { id: string; donnees: ModifierClient }): Promise<Client> {
    await this.trouver({ id });
    const ligne = await this.prisma.client.update({ where: { id }, data: donnees });
    return versClient({ ligne });
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.trouver({ id });
    await executerSansConflit({
      operation: () => this.prisma.client.delete({ where: { id } }),
      messageConflit: `Le client ${id} possède des parcelles : supprimez-les d'abord`,
    });
  }

  /**
   * Génère le lien d'accès à l'espace client. Seule l'empreinte du jeton est stockée ;
   * générer un nouveau lien révoque le précédent.
   */
  async genererAcces({ id }: { id: string }): Promise<AccesClient> {
    await this.trouver({ id });
    const jeton = genererJeton();
    const creeLe = new Date();
    await this.prisma.client.update({
      where: { id },
      data: { jetonAccesHash: empreinteJeton({ jeton }), jetonAccesCreeLe: creeLe },
    });
    return { jeton, creeLe: creeLe.toISOString() };
  }
}
