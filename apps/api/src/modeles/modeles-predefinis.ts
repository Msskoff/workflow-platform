import type { ConnexionWorkflow, GrapheWorkflow, RegleMetier } from '@workflow/shared';

export interface ModelePredefini {
  code: string;
  nom: string;
  description: string;
  graphe: GrapheWorkflow;
}

/** Connexion `source.port → cible.port`, identifiant dérivé des extrémités. */
function lien({
  source,
  sourcePort,
  cible,
  ciblePort,
}: Omit<ConnexionWorkflow, 'id'>): ConnexionWorkflow {
  return {
    id: `${source}.${sourcePort}->${cible}.${ciblePort}`,
    source,
    sourcePort,
    cible,
    ciblePort,
  };
}

/** Règles agronomiques du diagnostic initial, formulées pour l'agriculteur. */
const REGLES_DIAGNOSTIC: RegleMetier[] = [
  {
    id: 'zone-faible-etendue',
    nom: 'Zone faible étendue',
    active: true,
    indicateur: 'partZoneFaiblePourcent',
    operateur: '>',
    seuil: 20,
    recommandation:
      'Diagnostiquer la zone la plus faible (sol, drainage, levée) avant le prochain apport.',
    explication:
      'La zone de vigueur faible couvre {valeur} % de la parcelle, au-delà de {seuil} % il faut en comprendre la cause.',
    priorite: 'haute',
  },
  {
    id: 'parcelle-heterogene',
    nom: 'Parcelle hétérogène',
    active: true,
    indicateur: 'heterogeneiteNdviPourcent',
    operateur: '>',
    seuil: 15,
    recommandation: 'Moduler la fertilisation azotée selon les zones de vigueur.',
    explication:
      'La vigueur varie de {valeur} % d’un endroit à l’autre de la parcelle, un apport uniforme serait mal réparti.',
    priorite: 'normale',
  },
  {
    id: 'vigueur-a-surveiller',
    nom: 'Vigueur à surveiller',
    active: true,
    indicateur: 'ndviMoyen',
    operateur: '<',
    seuil: 0.65,
    recommandation: 'Refaire une analyse satellite dans 15 jours pour suivre la croissance.',
    explication:
      'La vigueur moyenne de la parcelle ({valeur}) reste sous {seuil}, un nouveau point permettra de vérifier qu’elle progresse.',
    priorite: 'normale',
  },
  {
    id: 'suivi-grande-parcelle',
    nom: 'Suivi de saison',
    active: true,
    indicateur: 'surfaceHa',
    operateur: '>',
    seuil: 10,
    recommandation: 'Prévoir un suivi satellite de la parcelle sur toute la saison.',
    explication:
      'Avec {valeur} ha, au-delà de {seuil} ha, un suivi régulier est rentabilisé par les économies d’intrants.',
    priorite: 'basse',
  },
];

/**
 * Diagnostic initial d'une parcelle :
 * import GPS → reprojection → contrôle qualité → surface → NDVI → zonage → règles → devis → rapport.
 *
 * Le contrôle qualité bloque le workflow si la géométrie est invalide ; comme il est déclaré
 * juste après la reprojection, il s'exécute avant les analyses qui en dépendent.
 * Il reste à charger le fichier GPS (Import GPS) et l'image satellite (NDVI).
 */
export const DIAGNOSTIC_INITIAL_PARCELLE: ModelePredefini = {
  code: 'diagnostic-initial-parcelle',
  nom: 'Diagnostic initial parcelle',
  description:
    'Contour GPS contrôlé et reprojeté en Lambert-93, surface, NDVI et zonage en 3 zones, règles agronomiques, devis et rapport PDF pour le client.',
  graphe: {
    noeuds: [
      { id: 'import_gps', type: 'collecte.import_gps', parametres: {}, position: { x: 0, y: 220 } },
      {
        id: 'reprojection',
        type: 'standardisation.reprojection',
        parametres: { crsCible: 'EPSG:2154' },
        position: { x: 300, y: 220 },
      },
      {
        id: 'controle_qualite',
        type: 'standardisation.controle_qualite',
        parametres: { exigerFormulaire: false, bloquerSiErreurs: true },
        position: { x: 600, y: 0 },
      },
      {
        id: 'surface',
        type: 'analyse.surface_perimetre',
        parametres: {},
        position: { x: 600, y: 200 },
      },
      { id: 'ndvi', type: 'analyse.ndvi', parametres: {}, position: { x: 600, y: 420 } },
      {
        id: 'zonage',
        type: 'analyse.zonage',
        parametres: { nombreZones: 3, methode: 'kmeans' },
        position: { x: 900, y: 460 },
      },
      {
        id: 'regles',
        type: 'decision.regles_metier',
        parametres: { regles: REGLES_DIAGNOSTIC },
        position: { x: 1200, y: 320 },
      },
      { id: 'devis', type: 'restitution.devis', parametres: {}, position: { x: 900, y: 140 } },
      {
        id: 'rapport',
        type: 'restitution.rapport_pdf',
        parametres: { nombreMaxDecisions: 5 },
        position: { x: 1500, y: 200 },
      },
    ],
    connexions: [
      lien({
        source: 'import_gps',
        sourcePort: 'geometrie',
        cible: 'reprojection',
        ciblePort: 'geometrie',
      }),
      lien({
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'controle_qualite',
        ciblePort: 'geometrie',
      }),
      lien({
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'surface',
        ciblePort: 'geometrie',
      }),
      lien({
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'ndvi',
        ciblePort: 'geometrie',
      }),
      lien({ source: 'ndvi', sourcePort: 'raster', cible: 'zonage', ciblePort: 'raster' }),
      lien({
        source: 'surface',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      }),
      lien({
        source: 'ndvi',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      }),
      lien({
        source: 'zonage',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      }),
      lien({ source: 'surface', sourcePort: 'surfaceHa', cible: 'devis', ciblePort: 'surfaceHa' }),
      lien({
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'rapport',
        ciblePort: 'geometrie',
      }),
      lien({ source: 'zonage', sourcePort: 'zonage', cible: 'rapport', ciblePort: 'zonage' }),
      lien({
        source: 'surface',
        sourcePort: 'indicateurs',
        cible: 'rapport',
        ciblePort: 'indicateurs',
      }),
      lien({
        source: 'ndvi',
        sourcePort: 'indicateurs',
        cible: 'rapport',
        ciblePort: 'indicateurs',
      }),
      lien({
        source: 'zonage',
        sourcePort: 'indicateurs',
        cible: 'rapport',
        ciblePort: 'indicateurs',
      }),
      lien({ source: 'regles', sourcePort: 'decisions', cible: 'rapport', ciblePort: 'decisions' }),
      lien({ source: 'devis', sourcePort: 'devis', cible: 'rapport', ciblePort: 'devis' }),
    ],
  },
};

/** Modèles fournis par la plateforme, synchronisés en base au démarrage de l'API. */
export const MODELES_PREDEFINIS: readonly ModelePredefini[] = [DIAGNOSTIC_INITIAL_PARCELLE];
