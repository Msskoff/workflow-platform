import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from './src/config/database-url';
import { loadRootEnv } from './src/config/load-root-env';

// Même `.env` racine que l'API au runtime.
loadRootEnv({ envFilePath: resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
