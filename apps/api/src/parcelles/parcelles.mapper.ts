import { parcelleSchema, type Parcelle } from '@workflow/shared';
import type { Parcelle as ParcelleLigne } from '../generated/prisma/client';

interface VersParcelleParams {
  ligne: ParcelleLigne;
}

/** Ligne Prisma → entité partagée (la géométrie JSON est revalidée). */
export function versParcelle({ ligne }: VersParcelleParams): Parcelle {
  return parcelleSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
