import type { GrapheWorkflow, ResultatRegles } from '@workflow/shared';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { extraireDecisions } from './extraire-decisions';

const decisionsRegles: ResultatRegles = {
  declenchees: [
    {
      regleId: 'vigueur',
      regleNom: 'Vigueur faible',
      priorite: 'haute',
      recommandation: 'Programmer un tour de plaine.',
      explication: 'Le NDVI moyen (0,42) est inférieur à 0,5.',
      motif: { indicateur: 'ndviMoyen', valeur: 0.42, operateur: '<', seuil: 0.5 },
    },
  ],
  ignorees: [],
  nombreEvaluees: 1,
};

// gps → ndvi → regles ; surface → regles (surface ne publie pas ndviMoyen).
const graphe: GrapheWorkflow = {
  noeuds: [
    { id: 'gps', type: 'collecte.import_gps', parametres: {} },
    { id: 'ndvi', type: 'analyse.ndvi', parametres: {} },
    { id: 'surface', type: 'analyse.surface_perimetre', parametres: {} },
    { id: 'regles', type: 'decision.regles_metier', parametres: {} },
  ],
  connexions: [
    { id: 'c1', source: 'gps', sourcePort: 'geometrie', cible: 'ndvi', ciblePort: 'geometrie' },
    { id: 'c2', source: 'gps', sourcePort: 'geometrie', cible: 'surface', ciblePort: 'geometrie' },
    {
      id: 'c3',
      source: 'ndvi',
      sourcePort: 'indicateurs',
      cible: 'regles',
      ciblePort: 'indicateurs',
    },
    {
      id: 'c4',
      source: 'surface',
      sourcePort: 'indicateurs',
      cible: 'regles',
      ciblePort: 'indicateurs',
    },
  ],
};

describe('extraireDecisions', () => {
  it('rattache chaque décision au nœud qui a fourni l’indicateur et à tout son amont', () => {
    const decisions = extraireDecisions({
      graphe,
      registre: creerRegistreNoeuds(),
      sorties: {
        ndvi: { indicateurs: { ndviMoyen: 0.42 } },
        surface: { indicateurs: { surfaceHa: 14.6 } },
        regles: { decisions: decisionsRegles, nombreDecisions: 1 },
      },
    });

    expect(decisions).toEqual([
      {
        noeudIds: ['gps', 'ndvi', 'regles'],
        explication: 'Le NDVI moyen (0,42) est inférieur à 0,5.',
        recommandation: 'Programmer un tour de plaine.',
        priorite: 'haute',
        donnees: {
          regleId: 'vigueur',
          regleNom: 'Vigueur faible',
          indicateur: 'ndviMoyen',
          libelleIndicateur: 'NDVI moyen',
          valeur: 0.42,
          operateur: '<',
          seuil: 0.5,
          source: { noeudId: 'ndvi', port: 'indicateurs' },
        },
      },
    ]);
  });

  it('ne produit rien sans règle déclenchée', () => {
    expect(
      extraireDecisions({
        graphe,
        registre: creerRegistreNoeuds(),
        sorties: { regles: { decisions: { ...decisionsRegles, declenchees: [] } } },
      }),
    ).toEqual([]);
  });
});
