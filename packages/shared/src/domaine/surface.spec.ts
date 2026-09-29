import type { GeometrieParcelle } from './geojson';
import { geometrieParcelleSchema } from './geojson';
import { calculerSurfaceHa } from './surface';

interface CarreParams {
  longitude: number;
  latitude: number;
  cote: number;
}

/** Anneau carré fermé de `cote` degrés, coin sud-ouest en (longitude, latitude). */
function carre({ longitude, latitude, cote }: CarreParams): [number, number][] {
  return [
    [longitude, latitude],
    [longitude + cote, latitude],
    [longitude + cote, latitude + cote],
    [longitude, latitude + cote],
    [longitude, latitude],
  ];
}

describe('calculerSurfaceHa', () => {
  it("calcule la surface d'un carré de 0,01° à l'équateur (≈ 123,6 ha)", () => {
    const geometrie: GeometrieParcelle = {
      type: 'Polygon',
      coordinates: [carre({ longitude: 0, latitude: 0, cote: 0.01 })],
    };

    expect(calculerSurfaceHa({ geometrie })).toBeCloseTo(123.64, 1);
  });

  it('soustrait les trous et additionne les polygones', () => {
    const exterieur = carre({ longitude: 0, latitude: 0, cote: 0.01 });
    const trou = carre({ longitude: 0.0025, latitude: 0.0025, cote: 0.005 });
    const avecTrou: GeometrieParcelle = { type: 'Polygon', coordinates: [exterieur, trou] };
    const double: GeometrieParcelle = {
      type: 'MultiPolygon',
      coordinates: [[exterieur], [carre({ longitude: 1, latitude: 0, cote: 0.01 })]],
    };

    expect(calculerSurfaceHa({ geometrie: avecTrou })).toBeCloseTo(123.64 * 0.75, 0);
    expect(calculerSurfaceHa({ geometrie: double })).toBeCloseTo(123.64 * 2, 0);
  });

  it('rejette un anneau non fermé', () => {
    const resultat = geometrieParcelleSchema.safeParse({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ],
    });

    expect(resultat.success).toBe(false);
  });
});
