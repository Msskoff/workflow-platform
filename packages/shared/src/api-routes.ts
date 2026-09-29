/** Chemins des routes HTTP de l'API, communs au client (web) et au serveur (api). */
export const apiRoutes = {
  health: '/health',
} as const;

export type ApiRoute = (typeof apiRoutes)[keyof typeof apiRoutes];
