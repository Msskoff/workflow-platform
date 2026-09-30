import { decisionSchema, type Decision } from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import type { Decision as DecisionLigne } from '../generated/prisma/client';

interface VersDecisionParams {
  ligne: DecisionLigne;
}

/** Ligne Prisma → entité partagée (validée par le schéma Zod). */
export function versDecision({ ligne }: VersDecisionParams): Decision {
  return decisionSchema.parse({
    ...ligne,
    valideeLe: enIsoOuNull({ date: ligne.valideeLe }),
    envoyeeLe: enIsoOuNull({ date: ligne.envoyeeLe }),
    rejeteeLe: enIsoOuNull({ date: ligne.rejeteeLe }),
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}
