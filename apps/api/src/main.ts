import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { loadRootEnv } from './config/load-root-env';

/** Un snapshot peut embarquer un fichier GPS dans les paramètres d'un nœud (2 Mo max par fichier). */
const TAILLE_MAX_CORPS_JSON = '10mb';

async function bootstrap(): Promise<void> {
  // dist/main.js → racine du monorepo
  loadRootEnv({ envFilePath: resolve(__dirname, '../../../.env') });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: TAILLE_MAX_CORPS_JSON });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
