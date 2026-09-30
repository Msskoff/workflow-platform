import { libellesStatutsTacheLot, type StatutTacheLot } from '@workflow/shared';

const STYLES: Readonly<Record<StatutTacheLot, string>> = {
  en_attente: 'bg-neutral-100 text-neutral-700',
  en_cours: 'bg-sky-100 text-sky-800',
  reussie: 'bg-emerald-100 text-emerald-800',
  echouee: 'bg-red-100 text-red-800',
};

interface BadgeStatutTacheProps {
  statut: StatutTacheLot;
}

export function BadgeStatutTache({ statut }: BadgeStatutTacheProps) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLES[statut]}`}
      data-statut-tache={statut}
    >
      {libellesStatutsTacheLot[statut]}
    </span>
  );
}
