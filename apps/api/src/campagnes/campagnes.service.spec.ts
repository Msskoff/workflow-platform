import { BadRequestException, ConflictException } from '@nestjs/common';
import { DonneesBrutesService } from '../donnees-brutes/donnees-brutes.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { CampagnesService } from './campagnes.service';

describe('CampagnesService', () => {
  let base: BaseDeTest;
  let service: CampagnesService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new CampagnesService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('clôture une campagne avec une date de fin cohérente', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });

    const cloturee = await service.modifier({
      id: campagne.id,
      donnees: { dateFin: '2026-07-20' },
    });

    expect(cloturee).toMatchObject({ dateDebut: '2025-10-15', dateFin: '2026-07-20' });
  });

  it('refuse une date de fin antérieure au début existant', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });

    await expect(
      service.modifier({ id: campagne.id, donnees: { dateFin: '2025-01-01' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('supprime une campagne vide mais pas une campagne qui a des données brutes', async () => {
    const { campagne: vide } = await creerJeuDeDonnees({ prisma: base.prisma });
    await service.supprimer({ id: vide.id });

    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    await new DonneesBrutesService(base.prisma).importer({
      donnees: { campagneId: campagne.id, type: 'gps', source: 'trace.gpx', contenu: [] },
    });

    await expect(service.supprimer({ id: campagne.id })).rejects.toThrow(ConflictException);
  });
});
