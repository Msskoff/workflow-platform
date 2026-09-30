import type { CreerCulture, ParametresCulture } from '@workflow/shared';

/**
 * ⚠️ DONNÉES D'EXEMPLE — VALEURS À VALIDER PAR UN AGRONOME.
 *
 * Cycles, durées de stades, dates d'intervention, doses et seuils NDVI ci-dessous sont des
 * ordres de grandeur plausibles pour l'Afrique de l'Ouest (zones soudano-guinéenne et forestière),
 * rédigés pour démontrer la plateforme. Ils ne constituent PAS une préconisation : ils dépendent
 * de la variété, du sol, de la pluviométrie et des recommandations des services nationaux de
 * recherche et de vulgarisation. Toutes les cultures sont créées avec `aValider: true`.
 */

const NOTE_COMMUNE =
  'Valeurs indicatives NON validées, saisies pour la démonstration. À faire valider par un agronome (variété, zone agroécologique, recommandations nationales) avant tout usage en conseil.';

export const CULTURES_EXEMPLE: readonly CreerCulture[] = [
  {
    code: 'mais',
    nom: 'Maïs',
    nomScientifique: 'Zea mays',
    cycleJours: 110,
    aValider: true,
    noteValidation: `${NOTE_COMMUNE} Base : variété de cycle intermédiaire (90 à 120 j), semis en début de saison des pluies.`,
    stades: [
      {
        code: 'semis-levee',
        nom: 'Semis et levée',
        dureeJours: 10,
        interventions: [
          {
            code: 'mais-fumure-fond',
            libelle: 'Fumure de fond au semis',
            type: 'fertilisation',
            decalageJours: 0,
          },
          {
            code: 'mais-controle-levee',
            libelle: 'Contrôle de la levée et resemis éventuel',
            type: 'observation',
            decalageJours: 7,
          },
        ],
      },
      {
        code: 'vegetatif',
        nom: 'Croissance végétative (4 à 8 feuilles)',
        dureeJours: 30,
        interventions: [
          {
            code: 'mais-chenille',
            libelle: 'Surveillance de la chenille légionnaire',
            type: 'observation',
            decalageJours: 5,
          },
          {
            code: 'mais-uree-1',
            libelle: 'Premier apport d’urée (4 à 6 feuilles)',
            type: 'fertilisation',
            decalageJours: 10,
          },
          {
            code: 'mais-ndvi-vegetatif',
            libelle: 'Analyse satellite de vigueur',
            type: 'analyse_satellite',
            decalageJours: 25,
          },
        ],
      },
      {
        code: 'montaison',
        nom: 'Montaison',
        dureeJours: 20,
        interventions: [
          {
            code: 'mais-uree-2',
            libelle: 'Second apport d’urée (montaison)',
            type: 'fertilisation',
            decalageJours: 5,
          },
        ],
      },
      {
        code: 'floraison',
        nom: 'Floraison (panicules et soies)',
        dureeJours: 15,
        interventions: [
          {
            code: 'mais-stress-hydrique',
            libelle: 'Observation du stress hydrique',
            type: 'observation',
            decalageJours: 0,
          },
          {
            code: 'mais-ndvi-floraison',
            libelle: 'Analyse satellite au pic de végétation',
            type: 'analyse_satellite',
            decalageJours: 5,
          },
        ],
      },
      {
        code: 'remplissage',
        nom: 'Remplissage du grain',
        dureeJours: 25,
        interventions: [
          {
            code: 'mais-remplissage',
            libelle: 'Observation du remplissage des épis',
            type: 'observation',
            decalageJours: 10,
          },
        ],
      },
      {
        code: 'maturation',
        nom: 'Maturation et séchage',
        dureeJours: 10,
        interventions: [
          { code: 'mais-recolte', libelle: 'Récolte', type: 'recolte', decalageJours: 9 },
        ],
      },
    ],
  },
  {
    code: 'manioc',
    nom: 'Manioc',
    nomScientifique: 'Manihot esculenta',
    cycleJours: 360,
    aValider: true,
    noteValidation: `${NOTE_COMMUNE} Base : variété améliorée récoltée vers 12 mois après plantation des boutures.`,
    stades: [
      {
        code: 'installation',
        nom: 'Plantation et reprise des boutures',
        dureeJours: 30,
        interventions: [
          {
            code: 'manioc-reprise',
            libelle: 'Contrôle de la reprise et remplacement des manquants',
            type: 'observation',
            decalageJours: 20,
          },
        ],
      },
      {
        code: 'developpement-foliaire',
        nom: 'Développement foliaire',
        dureeJours: 60,
        interventions: [
          {
            code: 'manioc-npk',
            libelle: 'Apport d’engrais NPK',
            type: 'fertilisation',
            decalageJours: 10,
          },
          {
            code: 'manioc-sarclage',
            libelle: 'Sarclage',
            type: 'entretien',
            decalageJours: 20,
          },
          {
            code: 'manioc-mosaique',
            libelle: 'Observation de la mosaïque',
            type: 'observation',
            decalageJours: 30,
          },
          {
            code: 'manioc-ndvi-couverture',
            libelle: 'Analyse satellite de la couverture',
            type: 'analyse_satellite',
            decalageJours: 50,
          },
        ],
      },
      {
        code: 'tuberisation',
        nom: 'Tubérisation',
        dureeJours: 90,
        interventions: [
          {
            code: 'manioc-ndvi-tuberisation',
            libelle: 'Analyse satellite de vigueur',
            type: 'analyse_satellite',
            decalageJours: 45,
          },
        ],
      },
      {
        code: 'grossissement-racines',
        nom: 'Grossissement des racines',
        dureeJours: 120,
        interventions: [
          {
            code: 'manioc-cochenille',
            libelle: 'Observation cochenille et bactériose',
            type: 'observation',
            decalageJours: 30,
          },
          {
            code: 'manioc-ndvi-suivi',
            libelle: 'Analyse satellite de suivi',
            type: 'analyse_satellite',
            decalageJours: 90,
          },
        ],
      },
      {
        code: 'maturite',
        nom: 'Maturité et récolte',
        dureeJours: 60,
        interventions: [
          { code: 'manioc-recolte', libelle: 'Récolte', type: 'recolte', decalageJours: 30 },
        ],
      },
    ],
  },
  {
    code: 'cacao',
    nom: 'Cacao',
    nomScientifique: 'Theobroma cacao',
    cycleJours: 365,
    aValider: true,
    noteValidation: `${NOTE_COMMUNE} Base : cacaoyère adulte, campagne annuelle démarrant à la reprise des pluies, grande traite en fin de cycle. Produits phytosanitaires : n’utiliser que des spécialités homologuées localement.`,
    stades: [
      {
        code: 'reprise-floraison',
        nom: 'Reprise végétative et floraison',
        dureeJours: 60,
        interventions: [
          {
            code: 'cacao-taille',
            libelle: 'Taille d’entretien et égourmandage',
            type: 'entretien',
            decalageJours: 0,
          },
          {
            code: 'cacao-engrais',
            libelle: 'Fertilisation (engrais cacao)',
            type: 'fertilisation',
            decalageJours: 15,
          },
        ],
      },
      {
        code: 'nouaison',
        nom: 'Nouaison et jeunes cabosses (chérelles)',
        dureeJours: 60,
        interventions: [
          {
            code: 'cacao-mirides',
            libelle: 'Traitement contre les mirides',
            type: 'traitement',
            decalageJours: 20,
          },
          {
            code: 'cacao-ndvi-couvert',
            libelle: 'Analyse satellite du couvert',
            type: 'analyse_satellite',
            decalageJours: 40,
          },
        ],
      },
      {
        code: 'grossissement-cabosses',
        nom: 'Grossissement des cabosses',
        dureeJours: 90,
        interventions: [
          {
            code: 'cacao-fongicide-1',
            libelle: 'Traitement contre la pourriture brune (1er passage)',
            type: 'traitement',
            decalageJours: 10,
          },
          {
            code: 'cacao-fongicide-2',
            libelle: 'Traitement contre la pourriture brune (2e passage)',
            type: 'traitement',
            decalageJours: 40,
          },
          {
            code: 'cacao-swollen-shoot',
            libelle: 'Observation du swollen shoot',
            type: 'observation',
            decalageJours: 60,
          },
        ],
      },
      {
        code: 'maturation',
        nom: 'Maturation des cabosses',
        dureeJours: 60,
        interventions: [
          {
            code: 'cacao-ndvi-recolte',
            libelle: 'Analyse satellite avant récolte',
            type: 'analyse_satellite',
            decalageJours: 10,
          },
        ],
      },
      {
        code: 'grande-traite',
        nom: 'Grande traite (récolte et écabossage)',
        dureeJours: 95,
        interventions: [
          {
            code: 'cacao-recolte-1',
            libelle: 'Récolte, premier passage',
            type: 'recolte',
            decalageJours: 5,
          },
          {
            code: 'cacao-recolte-2',
            libelle: 'Récolte, second passage',
            type: 'recolte',
            decalageJours: 45,
          },
        ],
      },
    ],
  },
];

/**
 * ⚠️ Paramètres par défaut des modèles « Diagnostic » de chaque culture — À VALIDER.
 * Seuils NDVI : le couvert arboré du cacao donne des NDVI plus élevés que le maïs ou le manioc.
 * Tarifs HT en euros, ramenés à des niveaux adaptés aux exploitations d'Afrique de l'Ouest.
 */
export const PARAMETRES_CULTURES_EXEMPLE: Readonly<Record<string, ParametresCulture>> = {
  mais: {
    seuilsNdvi: { vigueurASurveiller: 0.6, heterogeneitePourcent: 20, partZoneFaiblePourcent: 25 },
    dosesReference: [
      { intervention: 'mais-fumure-fond', intrant: 'NPK 15-15-15', dose: 200, unite: 'kg/ha' },
      { intervention: 'mais-uree-1', intrant: 'Urée 46 %', dose: 50, unite: 'kg/ha' },
      { intervention: 'mais-uree-2', intrant: 'Urée 46 %', dose: 50, unite: 'kg/ha' },
    ],
    tarifs: { cartographieNdviParHa: 5, zonageParHa: 8, suiviSaisonParHa: 10, fraisFixes: 30 },
    aValider: true,
  },
  manioc: {
    seuilsNdvi: { vigueurASurveiller: 0.55, heterogeneitePourcent: 25, partZoneFaiblePourcent: 30 },
    dosesReference: [
      { intervention: 'manioc-npk', intrant: 'NPK 10-18-18', dose: 300, unite: 'kg/ha' },
    ],
    tarifs: { cartographieNdviParHa: 4, zonageParHa: 6, suiviSaisonParHa: 8, fraisFixes: 25 },
    aValider: true,
  },
  cacao: {
    seuilsNdvi: { vigueurASurveiller: 0.7, heterogeneitePourcent: 15, partZoneFaiblePourcent: 20 },
    dosesReference: [
      {
        intervention: 'cacao-engrais',
        intrant: 'Engrais cacao NPK 0-23-19',
        dose: 300,
        unite: 'kg/ha',
      },
      {
        intervention: 'cacao-mirides',
        intrant: 'Insecticide homologué contre les mirides',
        dose: 1,
        unite: 'L/ha',
      },
      {
        intervention: 'cacao-fongicide-1',
        intrant: 'Fongicide homologué (pourriture brune)',
        dose: 1.5,
        unite: 'kg/ha',
      },
      {
        intervention: 'cacao-fongicide-2',
        intrant: 'Fongicide homologué (pourriture brune)',
        dose: 1.5,
        unite: 'kg/ha',
      },
    ],
    tarifs: { cartographieNdviParHa: 4, zonageParHa: 6, suiviSaisonParHa: 8, fraisFixes: 25 },
    aValider: true,
  },
};
