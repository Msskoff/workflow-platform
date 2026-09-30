'use client';

import type { Campagne } from '@workflow/shared';
import { useState } from 'react';
import { ApercuProposition } from '@/components/cultures/apercu-proposition';

interface PuceCampagneProps {
  campagne: Campagne;
}

/**
 * Campagne d'une parcelle ; si sa culture vient du référentiel, un clic déplie les modèles
 * proposés (ouvrables dans l'éditeur avec la campagne) et le calendrier prévisionnel.
 */
export function PuceCampagne({ campagne }: PuceCampagneProps) {
  const [ouverte, setOuverte] = useState(false);
  const libelle = `${campagne.nom}${campagne.culture ? ` · ${campagne.culture}` : ''}`;

  if (!campagne.cultureId) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{libelle}</span>;
  }
  return (
    <div className="w-full space-y-1">
      <button
        type="button"
        onClick={() => setOuverte((valeur) => !valeur)}
        aria-expanded={ouverte}
        className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
      >
        {libelle} · {ouverte ? 'masquer le plan' : 'voir le plan'}
      </button>
      {ouverte && (
        <ApercuProposition
          cultureId={campagne.cultureId}
          dateDebut={campagne.dateDebut}
          campagneId={campagne.id}
        />
      )}
    </div>
  );
}
