/** Chemins des routes HTTP de l'API, communs au client (web) et au serveur (api). */
export const apiRoutes = {
  health: '/health',
  clients: '/clients',
  parcelles: '/parcelles',
  campagnes: '/campagnes',
  donneesBrutes: '/donnees-brutes',
  executions: '/executions',
  decisions: '/decisions',
} as const;

export type ApiRoute = (typeof apiRoutes)[keyof typeof apiRoutes];
