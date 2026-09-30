import { executerNoeud, lireExemple } from '../../test/noeuds';
import { noeudImportGps } from './import-gps.noeud';
import { noeudReprojection } from './reprojection.noeud';
import { noeudSurfacePerimetre } from './surface-perimetre.noeud';

async function contourExemple() {
  const { geometrie } = await executerNoeud({
    definition: noeudImportGps,
    params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
  });
  return geometrie;
}

describe('Surface et périmètre', () => {
  it('calcule surface, périmètre et compacité de la parcelle d’exemple', async () => {
    const { surfaceHa, perimetreM, indicateurs } = await executerNoeud({
      definition: noeudSurfacePerimetre,
      inputs: { geometrie: await contourExemple() },
    });

    expect(surfaceHa).toBeCloseTo(14.64, 1);
    expect(perimetreM).toBeGreaterThan(1500);
    expect(perimetreM).toBeLessThan(1600);
    expect(indicateurs).toEqual({ surfaceHa, perimetreM, indiceCompacite: expect.any(Number) });
    expect(indicateurs.indiceCompacite).toBeGreaterThan(0.7);
    expect(indicateurs.indiceCompacite).toBeLessThan(0.8);
  });

  it('donne le même résultat depuis le Lambert-93', async () => {
    const wgs84 = await contourExemple();
    const { geometrie: lambert } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: wgs84 },
    });

    const [depuisWgs84, depuisLambert] = await Promise.all(
      [wgs84, lambert].map((geometrie) =>
        executerNoeud({ definition: noeudSurfacePerimetre, inputs: { geometrie } }),
      ),
    );

    expect(depuisLambert?.surfaceHa).toBeCloseTo(depuisWgs84?.surfaceHa ?? NaN, 3);
    expect(depuisLambert?.perimetreM).toBeCloseTo(depuisWgs84?.perimetreM ?? NaN, 0);
  });

  it('refuse une géométrie invalide', async () => {
    await expect(
      executerNoeud({
        definition: noeudSurfacePerimetre,
        inputs: {
          geometrie: {
            crs: 'EPSG:4326',
            geometrie: {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 48],
                  [1.1, 48],
                  [1.1, 48.1],
                ],
              ],
            },
          },
        },
      }),
    ).rejects.toThrow(/contrôle qualité/);
  });
});
