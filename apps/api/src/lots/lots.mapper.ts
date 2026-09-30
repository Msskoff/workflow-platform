import {
  calculerProgression,
  lotSchema,
  resumeLotSchema,
  statutTacheLotSchema,
  type Lot,
  type ResumeLot,
} from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import type { Prisma } from '../generated/prisma/client';

/** Relations nécessaires pour présenter un lot et ses tâches. */
export const INCLURE_TACHES = {
  taches: {
    include: {
      parcelle: { include: { client: true } },
      campagne: true,
    },
    orderBy: { creeLe: 'asc' },
  },
} as const satisfies Prisma.LotInclude;

type LigneLot = Prisma.LotGetPayload<{ include: typeof INCLURE_TACHES }>;

/** Valeurs communes affichables : un fichier est résumé par sa taille. */
function valeursAffichables({ valeurs }: { valeurs: unknown }): Record<string, string | number> {
  if (typeof valeurs !== 'object' || valeurs === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(valeurs as Record<string, unknown>).map(([nom, valeur]) => [
      nom,
      typeof valeur === 'string' && valeur.length > 200
        ? `[fichier de ${Math.round((valeur.length * 0.75) / 1024)} Ko]`
        : typeof valeur === 'number'
          ? valeur
          : String(valeur),
    ]),
  );
}

/** Ligne Prisma → résumé partagé (progression calculée à partir des tâches). */
export function versResumeLot({ ligne }: { ligne: LigneLot }): ResumeLot {
  const statuts = ligne.taches.map((tache) => statutTacheLotSchema.parse(tache.statut));
  const { progression, statut } = calculerProgression({ statuts });
  return resumeLotSchema.parse({
    id: ligne.id,
    nom: ligne.nom,
    modele: { id: ligne.modeleId, nom: ligne.modeleNom },
    valeurs: valeursAffichables({ valeurs: ligne.valeurs }),
    statut,
    progression,
    creeLe: ligne.creeLe.toISOString(),
  });
}

/** Ligne Prisma → lot partagé avec le détail de chaque parcelle. */
export function versLot({ ligne }: { ligne: LigneLot }): Lot {
  return lotSchema.parse({
    ...versResumeLot({ ligne }),
    taches: ligne.taches.map((tache) => ({
      id: tache.id,
      parcelle: { id: tache.parcelle.id, nom: tache.parcelle.nom },
      client: { id: tache.parcelle.client.id, nom: tache.parcelle.client.nom },
      campagne: tache.campagne ? { id: tache.campagne.id, nom: tache.campagne.nom } : null,
      statut: tache.statut,
      tentatives: tache.tentatives,
      maxTentatives: tache.maxTentatives,
      erreur: tache.erreur,
      executionId: tache.executionId,
      prochaineTentativeLe:
        tache.statut === 'en_attente' ? enIsoOuNull({ date: tache.prochaineTentativeLe }) : null,
      termineeLe: enIsoOuNull({ date: tache.termineeLe }),
    })),
  });
}
