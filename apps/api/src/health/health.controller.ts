import { Controller, Get } from '@nestjs/common';
import { apiRoutes, type HealthStatus } from '@workflow/shared';
import { HealthService } from './health.service';

@Controller(apiRoutes.health)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthStatus {
    return this.healthService.getStatus();
  }
}
