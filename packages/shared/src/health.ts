import { z } from 'zod';

/** Réponse de `GET /health` : produite par l'API, validée par le web. */
export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
