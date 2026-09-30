import { zonageSchema, type RasterNdvi } from '@workflow/shared';
import { executerNoeud, lireExemple, lireExempleBase64 } from '../../test/noeuds';
import { noeudImportGps } from './import-gps.noeud';
import { noeudNdvi } from './ndvi.noeud';
import { noeudZonage } from './zonage.noeud';

async function rasterExemple(): Promise<RasterNdvi> {
  const { geometrie } = await executerNoeud({
    definition: noeudImportGps,
    params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
  });
  const { raster } = await executerNoeud({
    definition: noeudNdvi,
    inputs: { geometrie },
    params: { image: lireExempleBase64({ nom: 'sentinel2-parcelle.tif' }) },
  });
  return raster;
}

function rasterManuel({ valeurs }: { valeurs: (number | null)[] }): RasterNdvi {
  return {
    crs: 'EPSG:2154',
    largeur: valeurs.length,
    hauteur: 1,
    origineX: 0,
    origineY: 0,
    resolutionX: 10,
    resolutionY: -10,
    surfacePixelM2: 100,
    valeurs,
  };
}

describe('Zonage', () => {
  it('retrouve les trois bandes de vigueur de l’image d’exemple', async () => {
    const { zonage, indicateurs } = await executerNoeud({
      definition: noeudZonage,
      inputs: { raster: await rasterExemple() },
      params: { nombreZones: 3 },
    });

    expect(zonageSchema.safeParse(zonage).success).toBe(true);
    const moyennes = zonage.zones.map((zone) => zone.ndviMoyen);
    [0.35, 0.6, 0.8].forEach((attendue, index) => expect(moyennes[index]).toBeCloseTo(attendue, 1));
    zonage.zones.forEach((zone) => {
      expect(zone.partSurface).toBeGreaterThan(20);
      expect(zone.partSurface).toBeLessThan(45);
    });
    expect(zonage.zones.reduce((total, zone) => total + zone.partSurface, 0)).toBeCloseTo(100, 0);
    expect(indicateurs.nombreZones).toBe(3);
    expect(indicateurs.heterogeneiteNdviPourcent).toBeGreaterThan(25);
  });

  it('numérote les zones du NDVI le plus faible au plus fort et ignore les pixels vides', async () => {
    const { zonage } = await executerNoeud({
      definition: noeudZonage,
      inputs: { raster: rasterManuel({ valeurs: [0.8, null, 0.2, 0.21, 0.79, 0.5] }) },
      params: { nombreZones: 3 },
    });

    expect(zonage.classes).toEqual([3, null, 1, 1, 3, 2]);
    expect(zonage.zones.map((zone) => zone.nombrePixels)).toEqual([2, 1, 2]);
  });

  it('produit moins de zones que demandé si les valeurs sont trop peu variées', async () => {
    const { zonage } = await executerNoeud({
      definition: noeudZonage,
      inputs: { raster: rasterManuel({ valeurs: [0.4, 0.4, 0.7, 0.7] }) },
      params: { nombreZones: 5 },
    });

    expect(zonage.zones).toHaveLength(2);
  });

  it('découpe en surfaces égales avec la méthode des quantiles', async () => {
    const { zonage } = await executerNoeud({
      definition: noeudZonage,
      inputs: { raster: rasterManuel({ valeurs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] }) },
      params: { nombreZones: 2, methode: 'quantiles' },
    });

    expect(zonage.zones.map((zone) => zone.nombrePixels)).toEqual([3, 3]);
  });
});
