import { resolve } from 'node:path';
import { loadRootEnv } from '../config/load-root-env';
import { PrismaService } from '../prisma/prisma.service';
import { seederCultures } from './seed-cultures';

/** `npm run db:seed` : données d'exemple (cultures et rattachement des modèles). */
async function principal(): Promise<void> {
  // dist/seed/seed.main.js → racine du monorepo
  loadRootEnv({ envFilePath: resolve(__dirname, '../../../../.env') });
  const prisma = new PrismaService();
  try {
    const { creees, conservees } = await seederCultures({ prisma });
    console.log(`Cultures créées : ${creees.join(', ') || 'aucune'}`);
    console.log(`Cultures déjà présentes (non modifiées) : ${conservees.join(', ') || 'aucune'}`);
    console.log(
      '⚠️  Valeurs d’exemple à valider par un agronome avant tout usage en conseil (aValider = true).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
