import { Injectable } from '@nestjs/common';
import { healthStatusSchema, type HealthStatus } from '@workflow/shared';

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return healthStatusSchema.parse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  }
}
