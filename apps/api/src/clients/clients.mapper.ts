import { clientSchema, type Client } from '@workflow/shared';
import type { Client as ClientLigne } from '../generated/prisma/client';

interface VersClientParams {
  ligne: ClientLigne;
}

/** Ligne Prisma → entité partagée (validée par le schéma Zod). */
export function versClient({ ligne }: VersClientParams): Client {
  // Le jeton n'est jamais exposé : seulement le fait qu'un accès existe.
  return clientSchema.parse({
    ...ligne,
    accesActif: ligne.jetonAccesHash !== null,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
