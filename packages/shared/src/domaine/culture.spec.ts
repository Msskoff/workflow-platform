import {
  ajouterJours,
  calculerCalendrier,
  creerCultureSchema,
  problemesCulture,
  type StadePhenologique,
} from './culture';
import {
  appliquerParametresCulture,
  SERVICES_DEVIS,
  TYPE_NOEUD_DEVIS,
  TYPE_NOEUD_REGLES,
  type ParametresCulture,
} from './parametres-culture';
import type { GrapheWorkflow } from './workflow-snapshot';

const STADES: StadePhenologique[] = [
  {
    code: 'levee',
    nom: 'Levée',
    dureeJours: 10,
    interventions: [
      { code: 'fumure-fond', libelle: 'Fumure de fond', type: 'fertilisation', decalageJours: 0 },
    ],
  },
  {
    code: 'vegetatif',
    nom: 'Végétatif',
    dureeJours: 30,
    interventions: [
      { code: 'apport-uree', libelle: 'Apport d’urée', type: 'fertilisation', decalageJours: 15 },
      { code: 'ndvi', libelle: 'Analyse NDVI', type: 'analyse_satellite', decalageJours: 25 },
    ],
  },
];

const PARAMETRES: ParametresCulture = {
  seuilsNdvi: { vigueurASurveiller: 0.55, heterogeneitePourcent: 20, partZoneFaiblePourcent: 25 },
  dosesReference: [
    { intervention: 'apport-uree', intrant: 'Urée 46 %', dose: 100, unite: 'kg/ha' },
  ],
  tarifs: { cartographieNdviParHa: 4, zonageParHa: 6, suiviSaisonParHa: 10, fraisFixes: 30 },
  aValider: true,
};

describe('culture', () => {
  it('ajoute des jours à une date calendaire, y compris en fin de mois et d’année', () => {
    expect(ajouterJours({ date: '2026-01-31', jours: 1 })).toBe('2026-02-01');
    expect(ajouterJours({ date: '2026-12-25', jours: 10 })).toBe('2027-01-04');
    expect(ajouterJours({ date: '2028-02-28', jours: 1 })).toBe('2028-02-29');
  });

  it('exige que les stades couvrent exactement le cycle', () => {
    expect(problemesCulture({ cycleJours: 40, stades: STADES })).toEqual([]);
    expect(problemesCulture({ cycleJours: 45, stades: STADES })).toEqual([
      'La somme des durées des stades (40 j) doit égaler le cycle (45 j)',
    ]);
  });

  it('refuse une intervention placée après la fin de son stade', () => {
    const [levee] = STADES;
    const resultat = creerCultureSchema.safeParse({
      code: 'essai',
      nom: 'Essai',
      nomScientifique: null,
      cycleJours: 10,
      stades: [
        {
          ...levee,
          interventions: [
            { code: 'tardive', libelle: 'Trop tard', type: 'observation', decalageJours: 10 },
          ],
        },
      ],
      aValider: true,
      noteValidation: '',
    });

    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0]?.message).toContain('tombe après la fin du stade');
  });

  it('date les stades et les interventions, avec les doses de référence', () => {
    const calendrier = calculerCalendrier({
      culture: { stades: STADES },
      dateDebut: '2026-04-01',
      dosesReference: PARAMETRES.dosesReference,
    });

    expect(calendrier.dateFinPrevue).toBe('2026-05-10');
    expect(calendrier.stades).toEqual([
      { code: 'levee', nom: 'Levée', debut: '2026-04-01', fin: '2026-04-10' },
      { code: 'vegetatif', nom: 'Végétatif', debut: '2026-04-11', fin: '2026-05-10' },
    ]);
    expect(calendrier.interventions.map(({ date, code, dose }) => ({ date, code, dose }))).toEqual([
      { date: '2026-04-01', code: 'fumure-fond', dose: null },
      {
        date: '2026-04-26',
        code: 'apport-uree',
        dose: { intrant: 'Urée 46 %', dose: 100, unite: 'kg/ha' },
      },
      { date: '2026-05-06', code: 'ndvi', dose: null },
    ]);
  });
});

describe('paramètres par culture', () => {
  const graphe: GrapheWorkflow = {
    noeuds: [
      {
        id: 'regles',
        type: TYPE_NOEUD_REGLES,
        parametres: {
          regles: [
            {
              id: 'vigueur',
              nom: 'Vigueur',
              active: true,
              indicateur: 'ndviMoyen',
              operateur: '<',
              seuil: 0.65,
              recommandation: 'Surveiller.',
              explication: 'Vigueur {valeur}.',
              priorite: 'normale',
            },
            {
              id: 'surface',
              nom: 'Surface',
              active: true,
              indicateur: 'surfaceHa',
              operateur: '>',
              seuil: 10,
              recommandation: 'Suivre.',
              explication: 'Surface {valeur}.',
              priorite: 'basse',
            },
          ],
        },
      },
      {
        id: 'devis',
        type: TYPE_NOEUD_DEVIS,
        parametres: {
          services: [
            { libelle: SERVICES_DEVIS.cartographie, tarifHtParHa: 9, actif: true },
            { libelle: SERVICES_DEVIS.suivi, tarifHtParHa: 18, actif: true },
            { libelle: 'Visite terrain', tarifHtParHa: 3, actif: true },
          ],
          fraisFixesHt: 50,
          tauxTvaPourcent: 18,
        },
      },
    ],
    connexions: [],
  };

  it('fixe les seuils NDVI des règles et laisse les autres règles intactes', () => {
    const resultat = appliquerParametresCulture({ graphe, parametres: PARAMETRES });
    const regles = resultat.noeuds[0]?.parametres.regles as { indicateur: string; seuil: number }[];

    expect(regles.map(({ indicateur, seuil }) => ({ indicateur, seuil }))).toEqual([
      { indicateur: 'ndviMoyen', seuil: 0.55 },
      { indicateur: 'surfaceHa', seuil: 10 },
    ]);
    // Le graphe d'origine n'est pas modifié.
    expect((graphe.noeuds[0]?.parametres.regles as { seuil: number }[])[0]?.seuil).toBe(0.65);
  });

  it('fixe les tarifs du devis en gardant l’inclusion et les services ajoutés', () => {
    const resultat = appliquerParametresCulture({ graphe, parametres: PARAMETRES });

    expect(resultat.noeuds[1]?.parametres).toEqual({
      services: [
        { libelle: SERVICES_DEVIS.cartographie, tarifHtParHa: 4, actif: true },
        { libelle: SERVICES_DEVIS.zonage, tarifHtParHa: 6, actif: true },
        // Le suivi était inclus dans ce modèle : il le reste.
        { libelle: SERVICES_DEVIS.suivi, tarifHtParHa: 10, actif: true },
        { libelle: 'Visite terrain', tarifHtParHa: 3, actif: true },
      ],
      fraisFixesHt: 30,
      tauxTvaPourcent: 18,
    });
  });
});
