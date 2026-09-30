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
} as const;

/** Sous-chemin de lancement d'une exécution : `POST /executions/:id/lancer`. */
export const SOUS_CHEMIN_LANCER_EXECUTION = 'lancer';

export type ApiRoute = (typeof apiRoutes)[keyof typeof apiRoutes];
