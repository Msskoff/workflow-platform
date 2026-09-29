/** Base SQLite locale par défaut, relative au dossier apps/api. */
export const DEFAULT_DATABASE_URL = 'file:./prisma/dev.db';

/** URL de la base : `DATABASE_URL` si définie, sinon la base locale par défaut. */
export function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
