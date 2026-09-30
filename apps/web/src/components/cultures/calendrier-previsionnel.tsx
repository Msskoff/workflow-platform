import {
  libellesTypesIntervention,
  type CalendrierPrevisionnel as Calendrier,
  type TypeIntervention,
} from '@workflow/shared';
import { formaterDose, formaterJour } from '@/lib/suivi/format-suivi';

const COULEURS_TYPE: Readonly<Record<TypeIntervention, string>> = {
  analyse_satellite: 'bg-sky-100 text-sky-800',
  fertilisation: 'bg-emerald-100 text-emerald-800',
  traitement: 'bg-red-100 text-red-800',
  observation: 'bg-neutral-100 text-neutral-700',
  entretien: 'bg-lime-100 text-lime-800',
  recolte: 'bg-amber-100 text-amber-900',
};

interface CalendrierPrevisionnelProps {
  calendrier: Calendrier;
}

/** Stades datés, puis interventions prévues de chaque stade avec leur dose de référence. */
export function CalendrierPrevisionnel({ calendrier }: CalendrierPrevisionnelProps) {
  return (
    <div className="space-y-2 text-xs">
      <p className="text-neutral-600">
        Du {formaterJour({ date: calendrier.dateDebut })} au{' '}
        {formaterJour({ date: calendrier.dateFinPrevue })} (fin prévue).
      </p>
      <ol className="space-y-2">
        {calendrier.stades.map((stade) => {
          const interventions = calendrier.interventions.filter(
            (intervention) => intervention.stade.code === stade.code,
          );
          return (
            <li key={stade.code} className="rounded border border-neutral-200 p-2">
              <p className="font-semibold text-neutral-800">
                {stade.nom}{' '}
                <span className="font-normal text-neutral-500">
                  · {formaterJour({ date: stade.debut })} → {formaterJour({ date: stade.fin })}
                </span>
              </p>
              {interventions.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {interventions.map((intervention) => (
                    <li key={intervention.code} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-20 shrink-0 tabular-nums text-neutral-500">
                        {formaterJour({ date: intervention.date })}
                      </span>
                      <span
                        className={`rounded px-1.5 py-px text-[10px] font-medium ${COULEURS_TYPE[intervention.type]}`}
                      >
                        {libellesTypesIntervention[intervention.type]}
                      </span>
                      <span>{intervention.libelle}</span>
                      {intervention.dose && (
                        <span className="text-neutral-600">
                          — {intervention.dose.intrant},{' '}
                          {formaterDose({
                            dose: intervention.dose.dose,
                            unite: intervention.dose.unite,
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
