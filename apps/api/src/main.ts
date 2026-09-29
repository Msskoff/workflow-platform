import { NestFactory } from '@nestjs/core';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { loadRootEnv } from './config/load-root-env';

async function bootstrap(): Promise<void> {
  // dist/main.js → racine du monorepo
  loadRootEnv({ envFilePath: resolve(__dirname, '../../../.env') });

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
