import type { ProgressionLot } from '@workflow/shared';

interface BarreProgressionProps {
  progression: ProgressionLot;
}

/** Avancement d'un lot : réussies (vert) et échouées (rouge) sur le total. */
export function BarreProgression({ progression }: BarreProgressionProps) {
  const { total, reussies, echouees, enCours, enAttente } = progression;
  const part = (nombre: number) => (total === 0 ? 0 : (nombre / total) * 100);
  return (
    <div className="space-y-1">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={progression.pourcentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avancement du lot"
      >
        <div className="bg-emerald-600" style={{ width: `${part(reussies)}%` }} />
        <div className="bg-red-500" style={{ width: `${part(echouees)}%` }} />
        <div className="animate-pulse bg-sky-400" style={{ width: `${part(enCours)}%` }} />
      </div>
      <p className="text-xs text-neutral-600">
        {reussies} réussie(s) · {echouees} échouée(s) · {enCours} en cours · {enAttente} en attente
        — {progression.pourcentage.toLocaleString('fr-FR')} %
      </p>
    </div>
  );
}
