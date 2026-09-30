import {
  appliquerParametresCulture,
  type ConnexionWorkflow,
  type GrapheWorkflow,
  type ParametresCulture,
  type RegleMetier,
} from '@workflow/shared';
import { CULTURES_EXEMPLE, PARAMETRES_CULTURES_EXEMPLE } from '../cultures/cultures-exemple';

export interface ModelePredefini {
  code: string;
  nom: string;
  description: string;
  graphe: GrapheWorkflow;
  /** Code de la culture visée (rattachement fait à la synchronisation, si elle existe en base). */
  cultureCode?: string;
  /** Paramètres par défaut, déjà appliqués à `graphe`. */
  parametresDefaut?: ParametresCulture;
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
    variables: [],
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

/**
 * Déclinaison du diagnostic pour chaque culture d'exemple : même graphe, avec les seuils NDVI
 * et les tarifs de la culture. ⚠️ Paramètres à valider par un agronome (voir cultures-exemple.ts).
 */
export const DIAGNOSTICS_PAR_CULTURE: readonly ModelePredefini[] = CULTURES_EXEMPLE.flatMap(
  (culture) => {
    const parametres = PARAMETRES_CULTURES_EXEMPLE[culture.code];
    if (!parametres) {
      return [];
    }
    return [
      {
        code: `diagnostic-${culture.code}`,
        nom: `Diagnostic ${culture.nom.toLowerCase()}`,
        description: `Diagnostic initial adapté au ${culture.nom.toLowerCase()} : seuils NDVI, doses de référence et tarifs de la culture (valeurs à valider par un agronome).`,
        graphe: appliquerParametresCulture({
          graphe: DIAGNOSTIC_INITIAL_PARCELLE.graphe,
          parametres,
        }),
        cultureCode: culture.code,
        parametresDefaut: parametres,
      },
    ];
  },
);

/**
 * Diagnostic pensé pour l'exécution par lot (à la manière d'un graphe SNAP paramétré) :
 * le contour vient de la parcelle en base (`${parcelleId}`, rempli pour chaque parcelle du lot),
 * l'image satellite et la période sont des variables fournies au lancement.
 */
export const DIAGNOSTIC_PAR_LOT: ModelePredefini = {
  code: 'diagnostic-par-lot',
  nom: 'Diagnostic par lot (parcelles enregistrées)',
  description:
    'Diagnostic initial sur le contour enregistré de chaque parcelle : variables parcelleId, image satellite et période, pour l’exécution par lot.',
  graphe: {
    variables: [
      {
        nom: 'parcelleId',
        type: 'parcelle',
        libelle: 'Parcelle',
        obligatoire: true,
        valeurParDefaut: null,
      },
      {
        nom: 'image',
        type: 'fichier',
        libelle: 'Image satellite (GeoTIFF rouge + PIR)',
        obligatoire: true,
        valeurParDefaut: null,
      },
      {
        nom: 'dateDebut',
        type: 'date',
        libelle: 'Début de la période analysée',
        obligatoire: true,
        valeurParDefaut: null,
      },
      {
        nom: 'dateFin',
        type: 'date',
        libelle: 'Fin de la période analysée',
        obligatoire: true,
        valeurParDefaut: null,
      },
    ],
    noeuds: DIAGNOSTIC_INITIAL_PARCELLE.graphe.noeuds.map((noeud) => {
      if (noeud.id === 'import_gps') {
        return {
          id: 'contour',
          type: 'collecte.contour_parcelle',
          parametres: { parcelleId: '${parcelleId}' },
          position: noeud.position,
        };
      }
      if (noeud.id === 'ndvi') {
        return { ...noeud, parametres: { ...noeud.parametres, image: '${image}' } };
      }
      if (noeud.id === 'rapport') {
        return {
          ...noeud,
          parametres: {
            ...noeud.parametres,
            introduction:
              'Voici le bilan de votre parcelle pour la période du ${dateDebut} au ${dateFin}, établi à partir de son contour et d’une image satellite. Nous en tirons quelques recommandations simples, chacune expliquée.',
          },
        };
      }
      return noeud;
    }),
    connexions: DIAGNOSTIC_INITIAL_PARCELLE.graphe.connexions.map((connexion) =>
      connexion.source === 'import_gps' ? lien({ ...connexion, source: 'contour' }) : connexion,
    ),
  },
};

/** Modèles fournis par la plateforme, synchronisés en base au démarrage de l'API. */
export const MODELES_PREDEFINIS: readonly ModelePredefini[] = [
  DIAGNOSTIC_INITIAL_PARCELLE,
  DIAGNOSTIC_PAR_LOT,
  ...DIAGNOSTICS_PAR_CULTURE,
];
