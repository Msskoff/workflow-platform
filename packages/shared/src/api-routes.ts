/** Chemins des routes HTTP de l'API, communs au client (web) et au serveur (api). */
export const apiRoutes = {
  health: '/health',
  clients: '/clients',
  parcelles: '/parcelles',
  campagnes: '/campagnes',
  donneesBrutes: '/donnees-brutes',
  executions: '/executions',
  decisions: '/decisions',
  /** Catalogue des types de nœuds (descripteurs). */
  noeuds: '/noeuds',
  /** Décisions avec leur contexte, pour l'écran de revue interne. */
  revueDecisions: '/revue/decisions',
  modeles: '/modeles',
  /** Lecture seule pour l'espace client : décisions envoyées uniquement. */
  espaceClient: '/espace-client',
  /** Suivi de campagne interne : conseillé, appliqué, reste à faire. */
  suiviCampagnes: '/suivi/campagnes',
} as const;

/** Sous-chemin de lancement d'une exécution : `POST /executions/:id/lancer`. */
export const SOUS_CHEMIN_LANCER_EXECUTION = 'lancer';

export type ApiRoute = (typeof apiRoutes)[keyof typeof apiRoutes];
