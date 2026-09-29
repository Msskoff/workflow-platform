import { Test } from '@nestjs/testing';
import { healthStatusSchema } from '@workflow/shared';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('retourne un statut conforme au schéma partagé', () => {
    const result = healthStatusSchema.safeParse(controller.getHealth());

    expect(result.success).toBe(true);
  });
});
