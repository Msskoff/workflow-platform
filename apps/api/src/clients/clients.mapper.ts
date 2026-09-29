import { clientSchema, type Client } from '@workflow/shared';
import type { Client as ClientLigne } from '../generated/prisma/client';

interface VersClientParams {
  ligne: ClientLigne;
}

/** Ligne Prisma → entité partagée (validée par le schéma Zod). */
export function versClient({ ligne }: VersClientParams): Client {
  return clientSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
