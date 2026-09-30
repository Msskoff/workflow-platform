'use client';

import { libellesStatutsDecision, statutsDecision, type StatutDecision } from '@workflow/shared';

export type FiltreStatut = StatutDecision | 'tous';

interface OngletsStatutsProps {
  actif: FiltreStatut;
  comptes: Readonly<Record<FiltreStatut, number>>;
  surChoix: (params: { statut: FiltreStatut }) => void;
}

/** Filtre de la revue par statut, avec le nombre de décisions dans chacun. */
export function OngletsStatuts({ actif, comptes, surChoix }: OngletsStatutsProps) {
  const onglets: { statut: FiltreStatut; libelle: string }[] = [
    ...statutsDecision.map((statut) => ({ statut, libelle: libellesStatutsDecision[statut] })),
    { statut: 'tous', libelle: 'Toutes' },
  ];
  return (
    <div role="tablist" className="flex flex-wrap gap-1">
      {onglets.map(({ statut, libelle }) => (
        <button
          key={statut}
          type="button"
          role="tab"
          aria-selected={statut === actif}
          onClick={() => surChoix({ statut })}
          className={`rounded-full px-3 py-1 text-sm ${statut === actif ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}`}
        >
          {libelle} <span className="opacity-70">({comptes[statut]})</span>
        </button>
      ))}
    </div>
  );
}
