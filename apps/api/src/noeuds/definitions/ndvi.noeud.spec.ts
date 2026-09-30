import { rasterNdviSchema } from '@workflow/shared';
import { executerNoeud, lireExemple, lireExempleBase64 } from '../../test/noeuds';
import { noeudImportGps } from './import-gps.noeud';
import { noeudNdvi } from './ndvi.noeud';

const IMAGE = lireExempleBase64({ nom: 'sentinel2-parcelle.tif' });

async function contourExemple() {
  const { geometrie } = await executerNoeud({
    definition: noeudImportGps,
    params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
  });
  return geometrie;
}

describe('NDVI', () => {
  it('calcule le NDVI de l’image, masqué sur la parcelle', async () => {
    const { raster, ndviMoyen, indicateurs } = await executerNoeud({
      definition: noeudNdvi,
      inputs: { geometrie: await contourExemple() },
      params: { image: IMAGE },
    });

    expect(rasterNdviSchema.safeParse(raster).success).toBe(true);
    expect(raster.crs).toBe('EPSG:32631');
    expect(raster.surfacePixelM2).toBe(100);
    // Trois bandes de vigueur (0,35 / 0,6 / 0,8) de surfaces voisines.
    expect(ndviMoyen).toBeGreaterThan(0.5);
    expect(ndviMoyen).toBeLessThan(0.65);
    expect(indicateurs.ndviMin).toBeGreaterThan(0.25);
    expect(indicateurs.ndviMax).toBeLessThan(0.9);
    // Pixels de 100 m² dont le centre est dans la parcelle de 14,6 ha.
    expect(indicateurs.surfaceCouverteHa).toBeGreaterThan(13.5);
    expect(indicateurs.surfaceCouverteHa).toBeLessThan(15.5);
  });

  it('garde toute l’image sans parcelle, bordures comprises', async () => {
    const { raster, indicateurs } = await executerNoeud({
      definition: noeudNdvi,
      params: { image: IMAGE },
    });

    expect([raster.largeur, raster.hauteur]).toEqual([54, 40]);
    expect(indicateurs.pixelsValides).toBe(54 * 40);
    expect(indicateurs.ndviMin).toBeLessThan(0.25);
  });

  it('applique le décalage radiométrique et vérifie les numéros de bande', async () => {
    const sansDecalage = await executerNoeud({ definition: noeudNdvi, params: { image: IMAGE } });
    const avecDecalage = await executerNoeud({
      definition: noeudNdvi,
      params: { image: IMAGE, decalage: -100 },
    });

    expect(avecDecalage.ndviMoyen).toBeGreaterThan(sansDecalage.ndviMoyen);
    await expect(
      executerNoeud({ definition: noeudNdvi, params: { image: IMAGE, bandePir: 3 } }),
    ).rejects.toThrow(/2 bande\(s\)/);
  });

  it('signale une image absente, illisible ou hors parcelle', async () => {
    await expect(executerNoeud({ definition: noeudNdvi })).rejects.toThrow(/Aucune image/);
    await expect(
      executerNoeud({
        definition: noeudNdvi,
        params: { image: Buffer.from('pas une image').toString('base64') },
      }),
    ).rejects.toThrow(/GeoTIFF est attendu/);
    await expect(
      executerNoeud({
        definition: noeudNdvi,
        inputs: {
          geometrie: {
            crs: 'EPSG:4326',
            geometrie: {
              type: 'Polygon',
              coordinates: [
                [
                  [5, 45],
                  [5.01, 45],
                  [5.01, 45.01],
                  [5, 45],
                ],
              ],
            },
          },
        },
        params: { image: IMAGE },
      }),
    ).rejects.toThrow(/ne la recouvre pas/);
  });
});
