import { libellesPrioriteClient, type DecisionClient } from '@workflow/shared';

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
            {decision.priorite && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES_PRIORITE[decision.priorite]}`}
              >
                {libellesPrioriteClient[decision.priorite]}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-700">
            <span className="font-semibold">Pourquoi ? </span>
            {decision.explication}
          </p>
        </li>
      ))}
    </ol>
  );
}
