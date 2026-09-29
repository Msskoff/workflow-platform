import { Injectable } from '@nestjs/common';
import { healthStatusSchema, type HealthStatus } from '@workflow/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<HealthStatus> {
    const database = (await this.isDatabaseUp()) ? 'up' : 'down';

    return healthStatusSchema.parse({
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'api',
      database,
      timestamp: new Date().toISOString(),
    });
  }

  private async isDatabaseUp(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
