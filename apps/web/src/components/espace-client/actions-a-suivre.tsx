import { libellesPrioriteClient, type DecisionClient } from '@workflow/shared';
import { formaterDose, formaterJour } from '@/lib/suivi/format-suivi';
import { CaseFait } from './case-fait';

interface ActionsASuivreProps {
  jeton: string;
  /** Décisions envoyées, déjà triées par priorité. */
  decisions: readonly DecisionClient[];
}

/** Mention sous une action : priorité et ce qui est prévu (dose, date). */
function complement({ decision }: { decision: DecisionClient }): string | undefined {
  const { prevu } = decision;
  const morceaux = [
    decision.priorite === 'haute' && libellesPrioriteClient.haute,
    prevu.dose !== null &&
      `${prevu.produit ? `${prevu.produit}, ` : ''}${formaterDose({ dose: prevu.dose, unite: prevu.uniteDose })}`,
    prevu.date && `vers le ${formaterJour({ date: prevu.date })}`,
  ].filter((morceau): morceau is string => typeof morceau === 'string');
  return morceaux.length > 0 ? morceaux.join(' · ') : undefined;
}

/** Actions concrètes à cocher quand elles sont faites (par le fermier ou l'agent terrain). */
export function ActionsASuivre({ jeton, decisions }: ActionsASuivreProps) {
  const actions = decisions.filter((decision) => decision.recommandation);
  if (actions.length === 0) {
    return <p className="text-sm text-neutral-600">Rien à prévoir pour le moment.</p>;
  }
  const faites = actions.filter((decision) => decision.fait).length;
  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-600">
        Cochez chaque action une fois faite : votre conseiller est prévenu. {faites} sur{' '}
        {actions.length} faite(s).
      </p>
      <ul className="space-y-1">
        {actions.map((decision) => (
          <li key={decision.id}>
            <CaseFait
              jeton={jeton}
              decisionId={decision.id}
              fait={decision.fait}
              confirme={decision.faitConfirme}
              libelle={decision.recommandation ?? ''}
              complement={complement({ decision })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
