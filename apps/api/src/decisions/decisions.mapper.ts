import { decisionSchema, type Decision } from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import type { Decision as DecisionLigne } from '../generated/prisma/client';

interface VersDecisionParams {
  /** La photo (binaire) n'est jamais nécessaire ici : seule sa présence compte. */
  ligne: Omit<DecisionLigne, 'reelPhoto'> & { reelPhoto?: DecisionLigne['reelPhoto'] };
}

/**
 * Ligne Prisma → entité partagée (validée par le schéma Zod).
 * Les colonnes `prevu*` et `reel*` sont regroupées en volets ; le réel n'existe qu'une fois
 * sa date d'application saisie.
 * Le binaire de la photo, s'il est présent, est ignoré (le schéma ne garde que les champs connus).
 */
export function versDecision({ ligne }: VersDecisionParams): Decision {
  const {
    prevuProduit,
    prevuDose,
    prevuUniteDose,
    prevuDate,
    prevuCoutEstime,
    reelProduit,
    reelDose,
    reelUniteDose,
    reelDate,
    reelCout,
    reelPhotoType,
    ...colonnes
  } = ligne;
  return decisionSchema.parse({
    ...colonnes,
    prevu: {
      produit: prevuProduit,
      dose: prevuDose,
      uniteDose: prevuUniteDose,
      date: prevuDate,
      coutEstime: prevuCoutEstime,
    },
    reel:
      reelDate === null
        ? null
        : {
            produit: reelProduit,
            dose: reelDose,
            uniteDose: reelUniteDose,
            date: reelDate,
            cout: reelCout,
            photo: reelPhotoType !== null,
          },
    valideeLe: enIsoOuNull({ date: ligne.valideeLe }),
    envoyeeLe: enIsoOuNull({ date: ligne.envoyeeLe }),
    rejeteeLe: enIsoOuNull({ date: ligne.rejeteeLe }),
    appliqueeLe: enIsoOuNull({ date: ligne.appliqueeLe }),
    nonAppliqueeLe: enIsoOuNull({ date: ligne.nonAppliqueeLe }),
    creeLe: ligne.creeLe.toISOString(),
    modifieLe: ligne.modifieLe.toISOString(),
  });
}

/** Colonnes Prisma à lire pour une décision, sans le binaire de la photo. */
export const SANS_PHOTO = { omit: { reelPhoto: true } } as const;
