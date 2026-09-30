import { libellesStatutsDecision, type StatutDecision } from '@workflow/shared';

const STYLES: Readonly<Record<StatutDecision, string>> = {
  brouillon: 'bg-amber-100 text-amber-800',
  validé: 'bg-sky-100 text-sky-800',
  envoyé: 'bg-emerald-100 text-emerald-800',
  rejeté: 'bg-neutral-200 text-neutral-600',
};

interface BadgeStatutDecisionProps {
  statut: StatutDecision;
}

export function BadgeStatutDecision({ statut }: BadgeStatutDecisionProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLES[statut]}`}
      data-statut-decision={statut}
    >
      {libellesStatutsDecision[statut]}
    </span>
  );
}
