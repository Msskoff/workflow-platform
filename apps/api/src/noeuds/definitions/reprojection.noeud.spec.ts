import type { GeometrieGeoreferencee } from '@workflow/shared';
import { executerNoeud } from '../../test/noeuds';
import { noeudReprojection } from './reprojection.noeud';

function carre({
  x,
  y,
  cote,
}: {
  x: number;
  y: number;
  cote: number;
}): GeometrieGeoreferencee['geometrie'] {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [x, y],
        [x + cote, y],
        [x + cote, y + cote],
        [x, y + cote],
        [x, y],
      ],
    ],
  };
}

describe('Reprojection', () => {
  it('place l’origine du Lambert-93 (3°E, 46,5°N) en (700 000 ; 6 600 000)', async () => {
    const { geometrie } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: { crs: 'EPSG:4326', geometrie: carre({ x: 3, y: 46.5, cote: 0.01 }) } },
      params: { crsCible: 'EPSG:2154' },
    });

    expect(geometrie.crs).toBe('EPSG:2154');
    const [origine] = (geometrie.geometrie.coordinates as number[][][])[0] ?? [];
    expect(origine?.[0]).toBeCloseTo(700_000, 2);
    expect(origine?.[1]).toBeCloseTo(6_600_000, 2);
  });

  it('fait un aller-retour WGS84 → Lambert-93 → WGS84 sans dérive', async () => {
    const depart: GeometrieGeoreferencee = {
      crs: 'EPSG:4326',
      geometrie: carre({ x: 1.48, y: 48.44, cote: 0.004 }),
    };

    const { geometrie: lambert } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: depart },
      params: { crsCible: 'EPSG:2154' },
    });
    const { geometrie: retour } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: lambert },
      params: { crsCible: 'EPSG:4326' },
    });

    const attendu = (depart.geometrie.coordinates as number[][][]).flat(2);
    (retour.geometrie.coordinates as number[][][]).flat(2).forEach((valeur, index) => {
      expect(valeur).toBeCloseTo(attendu[index] ?? NaN, 7);
    });
  });

  it('laisse la géométrie inchangée si elle est déjà dans le système cible', async () => {
    const source: GeometrieGeoreferencee = {
      crs: 'EPSG:32631',
      geometrie: carre({ x: 400000, y: 5360000, cote: 100 }),
    };

    const { geometrie } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: source },
      params: { crsCible: 'EPSG:32631' },
    });

    expect(geometrie).toEqual(source);
  });

  it('échoue clairement quand un point est hors du domaine du système cible', async () => {
    await expect(
      executerNoeud({
        definition: noeudReprojection,
        inputs: { geometrie: { crs: 'EPSG:4326', geometrie: carre({ x: 0, y: 89, cote: 1 }) } },
        params: { crsCible: 'EPSG:3857' },
      }),
    ).rejects.toThrow(/Reprojection EPSG:4326 → EPSG:3857 impossible/);
  });
});
