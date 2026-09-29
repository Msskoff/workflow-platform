import Database from 'better-sqlite3';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const DOSSIER_MIGRATIONS = resolve(__dirname, '../../prisma/migrations');

export interface BaseDeTest {
  prisma: PrismaService;
  fermer: () => Promise<void>;
}

/** Applique toutes les migrations Prisma, dans l'ordre, sur un fichier SQLite vierge. */
function appliquerMigrations({ fichier }: { fichier: string }): void {
  const sqlite = new Database(fichier);
  try {
    const migrations = readdirSync(DOSSIER_MIGRATIONS, { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .map((entree) => entree.name)
      .sort();
    for (const migration of migrations) {
      sqlite.exec(readFileSync(join(DOSSIER_MIGRATIONS, migration, 'migration.sql'), 'utf8'));
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Crée une base SQLite temporaire, migrée (triggers compris), et un PrismaService connecté.
 * Chaque fichier de test a sa propre base : les tests sont isolés et parallélisables.
 */
export function creerBaseDeTest(): BaseDeTest {
  const dossier = mkdtempSync(join(tmpdir(), 'workflow-api-test-'));
  const fichier = join(dossier, 'test.db');
  appliquerMigrations({ fichier });

  const urlPrecedente = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${fichier}`;
  const prisma = new PrismaService();
  process.env.DATABASE_URL = urlPrecedente;

  return {
    prisma,
    fermer: async () => {
      await prisma.$disconnect();
      rmSync(dossier, { recursive: true, force: true });
    },
  };
}
