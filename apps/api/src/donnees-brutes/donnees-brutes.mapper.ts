import { donneeBruteSchema, type DonneeBrute } from '@workflow/shared';
import type { DonneeBrute as DonneeBruteLigne } from '../generated/prisma/client';

interface VersDonneeBruteParams {
  ligne: DonneeBruteLigne;
}

/** Ligne Prisma → entité partagée (validée par le schéma Zod). */
export function versDonneeBrute({ ligne }: VersDonneeBruteParams): DonneeBrute {
  return donneeBruteSchema.parse({
    ...ligne,
    importeeLe: ligne.importeeLe.toISOString(),
  });
}
