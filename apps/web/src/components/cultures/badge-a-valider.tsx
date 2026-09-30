interface BadgeAValiderProps {
  /** Précision affichée au survol (origine des valeurs, points à vérifier). */
  note?: string;
}

/** Signale des valeurs d'exemple non encore validées par un agronome. */
export function BadgeAValider({ note }: BadgeAValiderProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
      title={note}
    >
      ⚠ Valeurs à valider par un agronome
    </span>
  );
}
