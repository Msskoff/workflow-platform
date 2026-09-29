import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

interface IntrouvableParams {
  entite: string;
  id: string;
}

/** Erreur 404 homogène pour une entité absente. */
export function introuvable({ entite, id }: IntrouvableParams): NotFoundException {
  return new NotFoundException(`${entite} ${id} introuvable`);
}

export interface CauseSqlite {
  /** Code SQLite étendu, ex. `SQLITE_CONSTRAINT_FOREIGNKEY`, `SQLITE_CONSTRAINT_TRIGGER`. */
  originalCode?: string;
  originalMessage?: string;
}

/**
 * Code et message SQLite d'origine d'une erreur Prisma. L'adaptateur better-sqlite3
 * les range dans `meta.driverAdapterError.cause`.
 */
export function causeSqlite({ erreur }: { erreur: unknown }): CauseSqlite {
  if (!(erreur instanceof Prisma.PrismaClientKnownRequestError)) {
    return {};
  }
  const erreurAdaptateur = erreur.meta?.driverAdapterError as { cause?: CauseSqlite } | undefined;
  return erreurAdaptateur?.cause ?? {};
}

interface ExecuterSansConflitParams<Resultat> {
  operation: () => Promise<Resultat>;
  /** Message renvoyé si l'opération viole une clé étrangère (enfants existants). */
  messageConflit: string;
}

/** Message SQLite d'un `ON DELETE RESTRICT` (implémenté par SQLite comme un trigger interne). */
const MESSAGE_SQLITE_CLE_ETRANGERE = 'FOREIGN KEY constraint failed';

/**
 * Exécute une opération Prisma et traduit une violation de contrainte (P2003) en 409 Conflict.
 * Sert aux suppressions bloquées par `onDelete: Restrict`. L'adaptateur SQLite classe aussi
 * en P2003 les refus de nos triggers d'immuabilité : leur message d'origine est alors conservé.
 * Les deux cas portent le code `SQLITE_CONSTRAINT_TRIGGER`, seul le message les distingue.
 */
export async function executerSansConflit<Resultat>({
  operation,
  messageConflit,
}: ExecuterSansConflitParams<Resultat>): Promise<Resultat> {
  try {
    return await operation();
  } catch (erreur) {
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2003') {
      const { originalCode, originalMessage } = causeSqlite({ erreur });
      const refusParTrigger =
        originalCode === 'SQLITE_CONSTRAINT_TRIGGER' &&
        originalMessage !== undefined &&
        originalMessage !== MESSAGE_SQLITE_CLE_ETRANGERE;
      throw new ConflictException(refusParTrigger ? originalMessage : messageConflit);
    }
    throw erreur;
  }
}
