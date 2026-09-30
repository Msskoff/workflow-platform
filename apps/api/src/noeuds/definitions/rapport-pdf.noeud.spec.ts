import { rapportParcelleSchema } from '@workflow/shared';
import { executerNoeud, lireExemple, lireExempleBase64 } from '../../test/noeuds';
import { noeudImportGps } from './import-gps.noeud';
import { noeudNdvi } from './ndvi.noeud';
import { noeudRapportPdf } from './rapport-pdf.noeud';
import { noeudSurfacePerimetre } from './surface-perimetre.noeud';
import { noeudZonage } from './zonage.noeud';

describe('Rapport PDF', () => {
  it('fige carte, zones et indicateurs dans le système métrique du zonage', async () => {
    const { geometrie } = await executerNoeud({
      definition: noeudImportGps,
      params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
    });
    const ndvi = await executerNoeud({
      definition: noeudNdvi,
      inputs: { geometrie },
      params: { image: lireExempleBase64({ nom: 'sentinel2-parcelle.tif' }) },
    });
    const { zonage, indicateurs: indicateursZonage } = await executerNoeud({
      definition: noeudZonage,
      inputs: { raster: ndvi.raster },
    });
    const surface = await executerNoeud({
      definition: noeudSurfacePerimetre,
      inputs: { geometrie },
    });

    const { rapport } = await executerNoeud({
      definition: noeudRapportPdf,
      inputs: {
        geometrie,
        zonage,
        indicateurs: [surface.indicateurs, ndvi.indicateurs, indicateursZonage],
      },
      params: { nombreMaxDecisions: 3 },
    });

    expect(rapportParcelleSchema.safeParse(rapport).success).toBe(true);
    expect(rapport).toMatchObject({
      titre: 'Diagnostic de votre parcelle',
      nombreMaxDecisions: 3,
      carte: { crs: 'EPSG:32631' },
      devis: null,
      decisionsProposees: 0,
    });
    expect(rapport.surfaceHa).toBeCloseTo(14.64, 1);
    expect(rapport.indicateurs).toMatchObject({ nombreZones: 3 });
    // Contour reprojeté de WGS84 en UTM 31N (x en mètres, ~390 km).
    const [premier] =
      rapport.carte.contour?.type === 'Polygon' ? (rapport.carte.contour.coordinates[0] ?? []) : [];
    expect(premier?.[0]).toBeGreaterThan(100_000);
  });

  it('dessine en Lambert-93 quand il n’y a pas de zonage', async () => {
    const { geometrie } = await executerNoeud({
      definition: noeudImportGps,
      params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
    });

    const { rapport } = await executerNoeud({ definition: noeudRapportPdf, inputs: { geometrie } });

    expect(rapport.carte).toMatchObject({ crs: 'EPSG:2154', zonage: null });
    expect(rapport.surfaceHa).toBeNull();
  });

  it('borne le nombre de décisions entre 3 et 5', () => {
    expect(noeudRapportPdf.parametres.safeParse({ nombreMaxDecisions: 2 }).success).toBe(false);
    expect(noeudRapportPdf.parametres.safeParse({ nombreMaxDecisions: 6 }).success).toBe(false);
  });
});
