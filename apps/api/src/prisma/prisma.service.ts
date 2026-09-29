import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolveDatabaseUrl } from '../config/database-url';
import { PrismaClient } from '../generated/prisma/client';

/** Client Prisma injectable, connecté à SQLite via le driver better-sqlite3. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaBetterSqlite3({ url: resolveDatabaseUrl() }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
