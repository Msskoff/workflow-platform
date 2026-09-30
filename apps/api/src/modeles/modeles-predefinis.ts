import type { GrapheWorkflow } from '@workflow/shared';

export interface ModelePredefini {
  code: string;
  nom: string;
  description: string;
  graphe: GrapheWorkflow;
}

/**
 * Diagnostic initial d'une parcelle :
 * import GPS → reprojection → contrôle qualité → surface → NDVI → zonage → règles → devis.
 *
 * Le contrôle qualité bloque le workflow si la géométrie est invalide ; comme il est déclaré
 * juste après la reprojection, il s'exécute avant les analyses qui en dépendent.
 * Il reste à charger le fichier GPS (Import GPS) et l'image satellite (NDVI).
 */
export const DIAGNOSTIC_INITIAL_PARCELLE: ModelePredefini = {
  code: 'diagnostic-initial-parcelle',
  nom: 'Diagnostic initial parcelle',
  description:
    'Contour GPS contrôlé et reprojeté en Lambert-93, surface, NDVI et zonage en 3 zones, règles de vigueur et d’hétérogénéité, devis des services.',
  graphe: {
    noeuds: [
      { id: 'import_gps', type: 'collecte.import_gps', parametres: {}, position: { x: 0, y: 200 } },
      {
        id: 'reprojection',
        type: 'standardisation.reprojection',
        parametres: { crsCible: 'EPSG:2154' },
        position: { x: 300, y: 200 },
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
      { id: 'ndvi', type: 'analyse.ndvi', parametres: {}, position: { x: 600, y: 400 } },
      {
        id: 'zonage',
        type: 'analyse.zonage',
        parametres: { nombreZones: 3, methode: 'kmeans' },
        position: { x: 900, y: 440 },
      },
      {
        id: 'regles',
        type: 'decision.regles_metier',
        parametres: {},
        position: { x: 1200, y: 260 },
      },
      { id: 'devis', type: 'restitution.devis', parametres: {}, position: { x: 900, y: 120 } },
    ],
    connexions: [
      {
        id: 'gps-l93',
        source: 'import_gps',
        sourcePort: 'geometrie',
        cible: 'reprojection',
        ciblePort: 'geometrie',
      },
      {
        id: 'l93-qc',
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'controle_qualite',
        ciblePort: 'geometrie',
      },
      {
        id: 'l93-surface',
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'surface',
        ciblePort: 'geometrie',
      },
      {
        id: 'l93-ndvi',
        source: 'reprojection',
        sourcePort: 'geometrie',
        cible: 'ndvi',
        ciblePort: 'geometrie',
      },
      {
        id: 'ndvi-zonage',
        source: 'ndvi',
        sourcePort: 'raster',
        cible: 'zonage',
        ciblePort: 'raster',
      },
      {
        id: 'surface-regles',
        source: 'surface',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      },
      {
        id: 'ndvi-regles',
        source: 'ndvi',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      },
      {
        id: 'zonage-regles',
        source: 'zonage',
        sourcePort: 'indicateurs',
        cible: 'regles',
        ciblePort: 'indicateurs',
      },
      {
        id: 'surface-devis',
        source: 'surface',
        sourcePort: 'surfaceHa',
        cible: 'devis',
        ciblePort: 'surfaceHa',
      },
    ],
  },
};

/** Modèles fournis par la plateforme, synchronisés en base au démarrage de l'API. */
export const MODELES_PREDEFINIS: readonly ModelePredefini[] = [DIAGNOSTIC_INITIAL_PARCELLE];
