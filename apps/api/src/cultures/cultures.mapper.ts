import { cultureSchema, type Culture } from '@workflow/shared';
import type { Culture as CultureLigne } from '../generated/prisma/client';

/** Ligne Prisma → culture partagée (stades JSON revalidés). */
export function versCulture({ ligne }: { ligne: CultureLigne }): Culture {
  return cultureSchema.parse({
    ...ligne,
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
