import { healthStatusSchema } from './health';

describe('healthStatusSchema', () => {
  it('accepte un statut valide', () => {
    const result = healthStatusSchema.safeParse({
      status: 'ok',
      service: 'api',
      database: 'up',
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it('rejette un statut inconnu ou un horodatage invalide', () => {
    const result = healthStatusSchema.safeParse({
      status: 'down',
      service: 'api',
      database: 'up',
      timestamp: 'hier',
    });

    expect(result.success).toBe(false);
  });
});
