import { Test } from '@nestjs/testing';
import { healthStatusSchema } from '@workflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

interface CreateControllerParams {
  /** Simule une base joignable (`true`) ou en erreur (`false`). */
  databaseUp: boolean;
}

async function createController({ databaseUp }: CreateControllerParams): Promise<HealthController> {
  const prismaMock = {
    $queryRaw: databaseUp
      ? jest.fn().mockResolvedValue([{ 1: 1 }])
      : jest.fn().mockRejectedValue(new Error('SQLITE_CANTOPEN')),
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [HealthService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('retourne un statut conforme au schéma partagé quand la base répond', async () => {
    const controller = await createController({ databaseUp: true });
    const health = await controller.getHealth();

    expect(healthStatusSchema.safeParse(health).success).toBe(true);
    expect(health).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('passe en statut dégradé quand la base est indisponible', async () => {
    const controller = await createController({ databaseUp: false });
    const health = await controller.getHealth();

    expect(health).toMatchObject({ status: 'degraded', database: 'down' });
  });
});
