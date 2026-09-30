import type { PrioriteDecision } from '@workflow/shared';

const STYLES: Readonly<Record<PrioriteDecision, string>> = {
  basse: 'bg-neutral-100 text-neutral-600',
  normale: 'bg-sky-100 text-sky-800',
  haute: 'bg-red-100 text-red-800',
};

interface BadgePrioriteProps {
  priorite: PrioriteDecision;
}

/** Priorité d'une règle ou d'une décision. */
export function BadgePriorite({ priorite }: BadgePrioriteProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STYLES[priorite]}`}
    >
      {priorite}
    </span>
  );
}
