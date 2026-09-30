'use client';

import type { CampagneClient, EvenementChronologie } from '@workflow/shared';
import Link from 'next/link';
import { useState } from 'react';
import { formaterMoment } from '@/lib/espace-client/indicateurs-client';

const PASTILLES: Readonly<Record<EvenementChronologie['type'], string>> = {
  debut_campagne: 'bg-emerald-700',
  analyse: 'bg-sky-600',
  decision: 'bg-amber-500',
  application: 'bg-emerald-500',
  fin_campagne: 'bg-neutral-500',
};

const LIBELLES_TYPE: Readonly<Record<EvenementChronologie['type'], string>> = {
  debut_campagne: 'Début de saison',
  analyse: 'Analyse',
  decision: 'Recommandation',
  application: 'Fait',
  fin_campagne: 'Fin de saison',
};

interface ChronologieSaisonProps {
  campagnes: readonly CampagneClient[];
  evenements: readonly EvenementChronologie[];
  /** Analyse affichée en haut de page, mise en évidence dans la frise. */
  analyseCouranteId: string | null;
  /** Adresse de la page de la parcelle ; l'analyse choisie est passée en `?analyse=`. */
  hrefParcelle: string;
}

/** Frise de la saison, campagne par campagne : semis, analyses, recommandations, applications. */
export function ChronologieSaison({
  campagnes,
  evenements,
  analyseCouranteId,
  hrefParcelle,
}: ChronologieSaisonProps) {
  // Par défaut, la campagne de l'analyse affichée, sinon la plus récente.
  const [campagneId, setCampagneId] = useState(
    evenements.find((evenement) => evenement.analyseId === analyseCouranteId)?.campagneId ??
      [...campagnes].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))[0]?.id ??
      '',
  );
  const affiches = evenements.filter((evenement) => evenement.campagneId === campagneId);

  return (
    <div className="space-y-4">
      {campagnes.length > 1 && (
        <label className="flex items-center gap-2 text-sm">
          Saison
          <select
            value={campagneId}
            onChange={(evenement) => setCampagneId(evenement.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1"
          >
            {campagnes.map((campagne) => (
              <option key={campagne.id} value={campagne.id}>
                {campagne.nom}
                {campagne.culture ? ` · ${campagne.culture}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {affiches.length === 0 ? (
        <p className="text-sm text-neutral-600">Aucun événement pour cette saison.</p>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-neutral-200 pl-6">
          {affiches.map((evenement, index) => {
            const courant =
              evenement.type === 'analyse' && evenement.analyseId === analyseCouranteId;
            return (
              <li key={`${evenement.date}-${evenement.type}-${index}`} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full ring-4 ring-white ${PASTILLES[evenement.type]}`}
                  aria-hidden
                />
                <p className="text-xs text-neutral-500">
                  {formaterMoment({ date: evenement.date })} · {LIBELLES_TYPE[evenement.type]}
                </p>
                <p className="font-medium text-neutral-900">{evenement.titre}</p>
                {evenement.detail && <p className="text-sm text-neutral-600">{evenement.detail}</p>}
                {evenement.type === 'analyse' &&
                  evenement.analyseId &&
                  (courant ? (
                    <p className="text-xs font-semibold text-emerald-800">Affichée ci-dessus</p>
                  ) : (
                    <Link
                      href={`${hrefParcelle}?analyse=${encodeURIComponent(evenement.analyseId)}`}
                      className="text-xs font-semibold text-emerald-800 underline"
                    >
                      Voir cette analyse
                    </Link>
                  ))}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
