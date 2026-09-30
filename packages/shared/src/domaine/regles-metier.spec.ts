import { z } from 'zod';
import { defineNode } from '../noeuds/node-definition';
import { peutConnecter, validerWorkflow, type CatalogueNoeuds } from '../noeuds/validation';
import { catalogueIndicateurs, libelleIndicateur } from './indicateurs';
import { comparer, interpolerExplication, regleMetierSchema } from './regles';
import { calculerPerimetreM } from './surface';

describe('règles métier', () => {
  it('interpole l’explication avec des nombres au format français', () => {
    expect(
      interpolerExplication({
        modele: 'Le {indicateur} ({valeur}) est sous {seuil}.',
        valeur: 0.42137,
        seuil: 0.5,
        indicateur: 'NDVI moyen',
      }),
    ).toBe('Le NDVI moyen (0,421) est sous 0,5.');
  });

  it('compare avec une égalité tolérante aux arrondis', () => {
    expect(comparer({ valeur: 0.1 + 0.2, operateur: '=', seuil: 0.3 })).toBe(true);
    expect(comparer({ valeur: 0.1 + 0.2, operateur: '<', seuil: 0.3 })).toBe(false);
  });

  it('valide une règle et signale chaque champ manquant', () => {
    const resultat = regleMetierSchema.safeParse({
      id: 'r1',
      nom: '',
      indicateur: '',
      operateur: '<',
      seuil: 1,
      recommandation: 'Agir.',
      explication: 'Une phrase.',
    });

    expect(resultat.error?.issues.map((issue) => issue.path[0])).toEqual(['nom', 'indicateur']);
  });

  it('fournit les libellés des indicateurs du catalogue', () => {
    expect(libelleIndicateur({ cle: 'ndviMoyen' })).toBe(catalogueIndicateurs.ndviMoyen.libelle);
    expect(libelleIndicateur({ cle: 'inconnu' })).toBe('inconnu');
  });
});

describe('entrées multiples', () => {
  const source = defineNode({
    id: 'test.source',
    categorie: 'analyse',
    libelle: 'Source',
    description: 'Publie des indicateurs',
    entrees: {},
    sorties: { indicateurs: { type: 'indicateurs', libelle: 'Indicateurs' } },
    parametres: z.object({}),
    run: async () => ({ indicateurs: {} }),
  });
  const regles = defineNode({
    id: 'test.regles',
    categorie: 'decision',
    libelle: 'Règles',
    description: 'Reçoit plusieurs sources',
    entrees: { indicateurs: { type: 'indicateurs', libelle: 'Indicateurs', multiple: true } },
    sorties: {},
    parametres: z.object({}),
    // `inputs.indicateurs` est inféré comme un tableau.
    run: async ({ inputs }) => (inputs.indicateurs.length >= 0 ? {} : {}),
  });
  const catalogue: CatalogueNoeuds = { 'test.source': source, 'test.regles': regles };
  const noeuds = [
    { id: 'a', type: 'test.source' },
    { id: 'b', type: 'test.source' },
    { id: 'r', type: 'test.regles' },
  ];
  const aVersR = {
    id: 'ar',
    source: 'a',
    sourcePort: 'indicateurs',
    cible: 'r',
    ciblePort: 'indicateurs',
  };

  it('accepte plusieurs connexions, mais pas deux fois la même sortie', () => {
    const graphe = { noeuds, connexions: [aVersR] };

    expect(
      peutConnecter({
        graphe,
        catalogue,
        connexion: { source: 'b', sourcePort: 'indicateurs', cible: 'r', ciblePort: 'indicateurs' },
      }),
    ).toEqual({ ok: true });
    expect(
      peutConnecter({
        graphe,
        catalogue,
        connexion: { source: 'a', sourcePort: 'indicateurs', cible: 'r', ciblePort: 'indicateurs' },
      }),
    ).toMatchObject({ ok: false, erreur: { code: 'entree_deja_connectee' } });
  });

  it('exige au moins une connexion sur une entrée multiple obligatoire', () => {
    expect(validerWorkflow({ graphe: { noeuds, connexions: [] }, catalogue })).toContainEqual(
      expect.objectContaining({ code: 'entree_obligatoire_manquante', noeudId: 'r' }),
    );
  });
});

describe('calculerPerimetreM', () => {
  it('mesure un carré de 0,01° à l’équateur (4 × ≈ 1 112 m)', () => {
    const perimetre = calculerPerimetreM({
      geometrie: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.01, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0, 0],
          ],
        ],
      },
    });

    expect(perimetre).toBeCloseTo(4 * 1111.95, 0);
  });
});
