import type { StatutNoeud } from '@workflow/shared';

const styles: Readonly<Record<StatutNoeud, { libelle: string; classes: string }>> = {
  en_attente: { libelle: 'En attente', classes: 'bg-neutral-100 text-neutral-600' },
  en_cours: { libelle: 'En cours', classes: 'animate-pulse bg-blue-100 text-blue-700' },
  ok: { libelle: 'OK', classes: 'bg-emerald-100 text-emerald-700' },
  erreur: { libelle: 'Erreur', classes: 'bg-red-100 text-red-700' },
};

interface BadgeStatutNoeudProps {
  statut: StatutNoeud;
}

/** Statut d'exécution d'un nœud. */
export function BadgeStatutNoeud({ statut }: BadgeStatutNoeudProps) {
  const { libelle, classes } = styles[statut];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${classes}`}
      data-statut={statut}
    >
      {libelle}
    </span>
  );
}
