import type { GeometrieGeoreferencee } from '@workflow/shared';
import { executerNoeud, lireExemple, lireExempleJson } from '../../test/noeuds';
import { noeudControleQualite } from './controle-qualite.noeud';
import { noeudFormulaireTerrain } from './formulaire-terrain.noeud';
import { noeudImportGps } from './import-gps.noeud';
import { noeudReprojection } from './reprojection.noeud';

async function geometrieExemple({ nom }: { nom: string }): Promise<GeometrieGeoreferencee> {
  const { geometrie } = await executerNoeud({
    definition: noeudImportGps,
    params: { contenu: lireExemple({ nom }) },
  });
  return geometrie;
}

async function formulaireExemple({ nom }: { nom: string }) {
  const { formulaire } = await executerNoeud({
    definition: noeudFormulaireTerrain,
    params: lireExempleJson({ nom }),
  });
  return formulaire;
}

function codes({ constats }: { constats: { code: string }[] }): string[] {
  return constats.map((constat) => constat.code).sort();
}

describe('Contrôle qualité', () => {
  it('déclare conforme une parcelle et une saisie complètes, avec la surface', async () => {
    const { rapport, conforme } = await executerNoeud({
      definition: noeudControleQualite,
      inputs: {
        geometrie: await geometrieExemple({ nom: 'parcelle-contour.geojson' }),
        formulaire: await formulaireExemple({ nom: 'formulaire-complet.json' }),
      },
    });

    expect(conforme).toBe(true);
    expect(rapport.erreurs).toEqual([]);
    expect(rapport.avertissements).toEqual([]);
    expect(rapport.indicateurs).toMatchObject({
      nombrePolygones: 1,
      nombreSommets: 6,
      nombrePhotos: 1,
    });
    expect(rapport.indicateurs.surfaceHa).toBeGreaterThan(13);
    expect(rapport.indicateurs.surfaceHa).toBeLessThan(15);
  });

  it('calcule la même surface sur une géométrie en Lambert-93', async () => {
    const wgs84 = await geometrieExemple({ nom: 'parcelle-contour.geojson' });
    const { geometrie: lambert } = await executerNoeud({
      definition: noeudReprojection,
      inputs: { geometrie: wgs84 },
    });

    const [enWgs84, enLambert] = await Promise.all(
      [wgs84, lambert].map((geometrie) =>
        executerNoeud({
          definition: noeudControleQualite,
          inputs: { geometrie },
          params: { exigerFormulaire: false },
        }),
      ),
    );

    expect(enLambert?.rapport.indicateurs.surfaceHa).toBeCloseTo(
      enWgs84?.rapport.indicateurs.surfaceHa ?? NaN,
      2,
    );
  });

  it('détecte un contour qui se recoupe', async () => {
    const { rapport, conforme } = await executerNoeud({
      definition: noeudControleQualite,
      inputs: { geometrie: await geometrieExemple({ nom: 'parcelle-auto-intersectee.geojson' }) },
      params: { exigerFormulaire: false },
    });

    expect(conforme).toBe(false);
    expect(codes({ constats: rapport.erreurs })).toEqual(['AUTO_INTERSECTION']);
  });

  it('détecte anneau non fermé, anneau trop court et coordonnées inversées', async () => {
    const { rapport } = await executerNoeud({
      definition: noeudControleQualite,
      inputs: {
        geometrie: {
          crs: 'EPSG:4326',
          geometrie: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [1.48, 48.44],
                  [1.49, 48.44],
                  [1.49, 48.45],
                  [1.48, 48.45],
                ],
              ],
              [
                [
                  [1.5, 48.4],
                  [1.51, 48.4],
                  [1.5, 48.4],
                ],
              ],
            ],
          },
        },
      },
      params: { exigerFormulaire: false },
    });
    const inversee = await executerNoeud({
      definition: noeudControleQualite,
      inputs: {
        geometrie: {
          crs: 'EPSG:4326',
          geometrie: {
            type: 'Polygon',
            coordinates: [
              [
                [48.44, 1.48],
                [48.44, 1.49],
                [48.45, 1.49],
                [48.44, 1.48],
              ],
            ],
          },
        },
      },
      params: { exigerFormulaire: false },
    });

    expect(codes({ constats: rapport.erreurs })).toEqual(['ANNEAU_NON_FERME', 'ANNEAU_TROP_COURT']);
    expect(inversee.rapport.avertissements).toEqual([
      expect.objectContaining({ code: 'HORS_FRANCE', message: expect.stringMatching(/inversées/) }),
    ]);
  });

  it('liste les données manquantes d’une saisie incomplète', async () => {
    const { rapport } = await executerNoeud({
      definition: noeudControleQualite,
      inputs: { formulaire: await formulaireExemple({ nom: 'formulaire-incomplet.json' }) },
      params: { exigerGeometrie: false },
    });

    expect(codes({ constats: rapport.erreurs })).toEqual(['CULTURE_MANQUANTE']);
    expect(codes({ constats: rapport.avertissements })).toEqual([
      'HISTORIQUE_ANNEE_DOUBLON',
      'HISTORIQUE_INCOMPLET',
      'PHOTO_NON_GEOLOCALISEE',
      'SYSTEME_IRRIGATION_MANQUANT',
      'TYPE_SOL_MANQUANT',
    ]);
  });

  it('signale les entrées absentes et peut arrêter le workflow', async () => {
    const { rapport } = await executerNoeud({ definition: noeudControleQualite });

    expect(codes({ constats: rapport.erreurs })).toEqual([
      'FORMULAIRE_ABSENT',
      'GEOMETRIE_ABSENTE',
    ]);
    await expect(
      executerNoeud({ definition: noeudControleQualite, params: { bloquerSiErreurs: true } }),
    ).rejects.toThrow(/Contrôle qualité : 2 erreur/);
  });

  it('refuse une surface trop faible', async () => {
    const { rapport } = await executerNoeud({
      definition: noeudControleQualite,
      inputs: { geometrie: await geometrieExemple({ nom: 'parcelle-contour.geojson' }) },
      params: { exigerFormulaire: false, surfaceMinHa: 50 },
    });

    expect(codes({ constats: rapport.erreurs })).toEqual(['SURFACE_TROP_FAIBLE']);
  });
});
