import { campagneSchema, type Campagne } from '@workflow/shared';
import type { Campagne as CampagneLigne } from '../generated/prisma/client';

interface VersCampagneParams {
  ligne: CampagneLigne;
}

/** Ligne Prisma → entité partagée (validée par le schéma Zod). */
export function versCampagne({ ligne }: VersCampagneParams): Campagne {
  return campagneSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
