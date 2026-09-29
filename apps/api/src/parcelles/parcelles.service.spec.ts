import { NotFoundException } from '@nestjs/common';
import type { GeometrieParcelle } from '@workflow/shared';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerJeuDeDonnees, GEOMETRIE_TEST } from '../test/jeu-de-donnees';
import { ParcellesService } from './parcelles.service';

describe('ParcellesService', () => {
  let base: BaseDeTest;
  let service: ParcellesService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new ParcellesService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('stocke la géométrie GeoJSON et calcule la surface', async () => {
    const { parcelle } = await creerJeuDeDonnees({ prisma: base.prisma });

    expect(parcelle.geometrie).toEqual(GEOMETRIE_TEST);
    expect(parcelle.surfaceHa).toBeCloseTo(123.64, 1);
  });

  it('recalcule la surface quand la géométrie change', async () => {
    const { parcelle } = await creerJeuDeDonnees({ prisma: base.prisma });
    const moitie: GeometrieParcelle = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.005, 0],
          [0.005, 0.01],
          [0, 0.01],
          [0, 0],
        ],
      ],
    };

    const modifiee = await service.modifier({ id: parcelle.id, donnees: { geometrie: moitie } });

    expect(modifiee.surfaceHa).toBeCloseTo(parcelle.surfaceHa / 2, 1);
  });

  it('refuse une parcelle rattachée à un client inexistant', async () => {
    await expect(
      service.creer({ donnees: { clientId: 'absent', nom: 'X', geometrie: GEOMETRIE_TEST } }),
    ).rejects.toThrow(NotFoundException);
  });
});
