import { executerNoeud, lireExemple } from '../../test/noeuds';
import { noeudImportGps } from './import-gps.noeud';

function anneauExterieur({ geometrie }: { geometrie: { type: string; coordinates: unknown } }) {
  if (geometrie.type !== 'Polygon') {
    throw new Error(`Polygon attendu, ${geometrie.type} reçu`);
  }
  return (geometrie.coordinates as number[][][])[0] ?? [];
}

describe('Import GPS', () => {
  it('construit le contour d’une trace CSV (séparateur ;, virgule décimale, point répété)', async () => {
    const { geometrie, nombrePoints } = await executerNoeud({
      definition: noeudImportGps,
      params: { contenu: lireExemple({ nom: 'parcelle-trace.csv' }) },
    });

    const anneau = anneauExterieur({ geometrie: geometrie.geometrie });
    expect(geometrie.crs).toBe('EPSG:4326');
    expect(nombrePoints).toBe(7);
    expect(anneau).toHaveLength(7); // 6 sommets distincts + fermeture
    expect(anneau[0]).toEqual([1.48, 48.44]);
    expect(anneau[anneau.length - 1]).toEqual(anneau[0]);
  });

  it('prend l’enveloppe convexe de points GeoJSON relevés dans le désordre', async () => {
    const { geometrie, nombrePoints } = await executerNoeud({
      definition: noeudImportGps,
      params: {
        contenu: lireExemple({ nom: 'parcelle-points.geojson' }),
        methode: 'enveloppe_convexe',
      },
    });

    const anneau = anneauExterieur({ geometrie: geometrie.geometrie });
    expect(nombrePoints).toBe(9);
    // Les 3 points intérieurs et la bordure sud rentrante ne sont pas des sommets.
    expect(anneau).toHaveLength(6);
    expect(anneau).not.toContainEqual([1.482, 48.4415]);
  });

  it('reprend tel quel un contour GeoJSON déjà fermé', async () => {
    const { geometrie } = await executerNoeud({
      definition: noeudImportGps,
      params: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
    });

    expect(anneauExterieur({ geometrie: geometrie.geometrie })).toHaveLength(7);
  });

  it('lit un CSV à virgules et colonnes nommées, dans le système déclaré', async () => {
    const contenu = ['id,X,Y', '1,600000,6800000', '2,600100,6800000', '3,600100,6800100'].join(
      '\n',
    );

    const { geometrie } = await executerNoeud({
      definition: noeudImportGps,
      params: { contenu, crsSource: 'EPSG:2154' },
    });

    expect(geometrie.crs).toBe('EPSG:2154');
    expect(anneauExterieur({ geometrie: geometrie.geometrie })[1]).toEqual([600100, 6800000]);
  });

  it('signale un fichier vide, une colonne absente ou une ligne illisible', async () => {
    await expect(executerNoeud({ definition: noeudImportGps })).rejects.toThrow(
      /Aucun fichier GPS/,
    );
    await expect(
      executerNoeud({ definition: noeudImportGps, params: { contenu: 'a;b\n1;2' } }),
    ).rejects.toThrow(/Colonne X/);
    await expect(
      executerNoeud({
        definition: noeudImportGps,
        params: { contenu: 'lat;lon\n48,44;1,48\n48,45;abc' },
      }),
    ).rejects.toThrow(/ligne 3/);
  });

  it('refuse moins de 3 points distincts', async () => {
    await expect(
      executerNoeud({
        definition: noeudImportGps,
        params: { contenu: 'lat;lon\n48;1\n48;1\n49;1' },
      }),
    ).rejects.toThrow(/3 points distincts/);
  });
});
