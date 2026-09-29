import { apiRoutes, healthStatusSchema, type HealthStatus } from '@workflow/shared';

export type ApiHealthResult = { ok: true; health: HealthStatus } | { ok: false; error: string };

interface FetchApiHealthParams {
  /** URL de base de l'API, sans slash final. */
  apiUrl: string;
}

/** Interroge `GET /health` et valide la réponse avec le schéma partagé. */
export async function fetchApiHealth({ apiUrl }: FetchApiHealthParams): Promise<ApiHealthResult> {
  try {
    const response = await fetch(`${apiUrl}${apiRoutes.health}`, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const parsed = healthStatusSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, error: 'Réponse non conforme au schéma partagé' };
    }

    return { ok: true, health: parsed.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}
