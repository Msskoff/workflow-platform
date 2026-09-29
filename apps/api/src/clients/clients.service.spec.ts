import { ConflictException, NotFoundException } from '@nestjs/common';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let base: BaseDeTest;
  let service: ClientsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new ClientsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('crée, lit, filtre, modifie et supprime un client', async () => {
    const client = await service.creer({
      donnees: { nom: 'GAEC du Moulin', email: 'gaec@example.fr' },
    });

    expect(await service.trouver({ id: client.id })).toMatchObject({ nom: 'GAEC du Moulin' });
    expect(await service.lister({ filtre: { nom: 'Moulin' } })).toHaveLength(1);

    const modifie = await service.modifier({ id: client.id, donnees: { telephone: '0102030405' } });
    expect(modifie).toMatchObject({ nom: 'GAEC du Moulin', telephone: '0102030405' });

    await service.supprimer({ id: client.id });
    await expect(service.trouver({ id: client.id })).rejects.toThrow(NotFoundException);
  });

  it('refuse de supprimer un client qui possède des parcelles', async () => {
    const { client } = await creerJeuDeDonnees({ prisma: base.prisma });

    const suppression = service.supprimer({ id: client.id });

    await expect(suppression).rejects.toThrow(ConflictException);
    await expect(suppression).rejects.toThrow(/possède des parcelles/);
  });
});
