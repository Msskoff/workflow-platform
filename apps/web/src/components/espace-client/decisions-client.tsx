import { libellesPrioriteClient, type DecisionClient } from '@workflow/shared';
import { formaterDose, formaterJour } from '@/lib/suivi/format-suivi';

/** Date calendaire (AAAA-MM-JJ) ou horodatage → « 2 oct. 2026 ». */
function formaterJourOuMoment({ date }: { date: string }): string {
  return formaterJour({ date: date.slice(0, 10) });
}

const STYLES_PRIORITE = {
  haute: 'bg-red-50 text-red-800 ring-red-200',
  normale: 'bg-sky-50 text-sky-800 ring-sky-200',
  basse: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
} as const;

interface DecisionsClientProps {
  /** Décisions envoyées, déjà triées par priorité. */
  decisions: readonly DecisionClient[];
}

/** Nos recommandations, chacune avec son « pourquoi ». */
export function DecisionsClient({ decisions }: DecisionsClientProps) {
  if (decisions.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Aucune recommandation pour cette analyse : votre conseiller vous préviendra dès qu’il y en
        aura.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {decisions.map((decision, index) => (
        <li key={decision.id} className="rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-neutral-900">
              {index + 1}. {decision.recommandation ?? 'Recommandation'}
            </h3>
            {decision.fait ? (
              <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-medium text-white">
                Fait
                {decision.faitLe ? ` le ${formaterJourOuMoment({ date: decision.faitLe })}` : ''}
              </span>
            ) : (
              decision.priorite && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES_PRIORITE[decision.priorite]}`}
                >
                  {libellesPrioriteClient[decision.priorite]}
                </span>
              )
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-700">
            <span className="font-semibold">Pourquoi ? </span>
            {decision.explication}
          </p>
          {(decision.prevu.produit || decision.prevu.dose !== null || decision.prevu.date) && (
            <p className="mt-1 text-sm text-neutral-700">
              <span className="font-semibold">Prévu : </span>
              {[
                decision.prevu.produit,
                decision.prevu.dose !== null &&
                  formaterDose({ dose: decision.prevu.dose, unite: decision.prevu.uniteDose }),
                decision.prevu.date && `vers le ${formaterJour({ date: decision.prevu.date })}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
