import { libellesPrioriteClient, type DecisionClient } from '@workflow/shared';

interface ActionsASuivreProps {
  /** Décisions envoyées, déjà triées par priorité. */
  decisions: readonly DecisionClient[];
}

/** Liste courte des actions concrètes, à cocher mentalement (comme dans le rapport PDF). */
export function ActionsASuivre({ decisions }: ActionsASuivreProps) {
  const actions = decisions.filter((decision) => decision.recommandation);
  if (actions.length === 0) {
    return <p className="text-sm text-neutral-600">Rien à prévoir pour le moment.</p>;
  }
  return (
    <ul className="space-y-2">
      {actions.map((decision) => (
        <li key={decision.id} className="flex items-start gap-3">
          <span
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-emerald-700"
            aria-hidden
          />
          <span className="text-sm text-neutral-800">
            {decision.recommandation}
            {decision.priorite === 'haute' && (
              <span className="ml-2 text-xs font-semibold text-red-700">
                {libellesPrioriteClient.haute}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
