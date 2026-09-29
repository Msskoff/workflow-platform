import { z } from 'zod';

/** Réponse de `GET /health` : produite par l'API, validée par le web. */
export const healthStatusSchema = z.object({
  /** `degraded` si une dépendance (ex. base de données) est indisponible. */
  status: z.enum(['ok', 'degraded']),
  service: z.string().min(1),
  database: z.enum(['up', 'down']),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
