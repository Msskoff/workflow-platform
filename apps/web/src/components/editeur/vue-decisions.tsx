import { formaterNombre, libelleIndicateur, type ResultatRegles } from '@workflow/shared';
import { BadgePriorite } from '@/components/regles/badge-priorite';

interface VueDecisionsProps {
  resultat: ResultatRegles;
}

/** Décisions produites par les règles : recommandation, pourquoi, et valeurs qui l'ont motivée. */
export function VueDecisions({ resultat }: VueDecisionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-neutral-500">
        {resultat.declenchees.length} décision(s) sur {resultat.nombreEvaluees} règle(s) évaluée(s)
        {resultat.declenchees.length > 0 && ', enregistrées en brouillon'}.
      </p>
      {resultat.declenchees.map((decision) => (
        <article
          key={decision.regleId}
          className="space-y-1 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs"
          data-decision={decision.regleId}
        >
          <header className="flex items-center justify-between gap-2">
            <span className="font-semibold">{decision.regleNom}</span>
            <BadgePriorite priorite={decision.priorite} />
          </header>
          <p className="font-medium text-emerald-900">{decision.recommandation}</p>
          <p className="text-neutral-700">
            <span className="font-semibold">Pourquoi : </span>
            {decision.explication}
          </p>
          <p className="font-mono text-[10px] text-neutral-500">
            {libelleIndicateur({ cle: decision.motif.indicateur })} ={' '}
            {formaterNombre({ nombre: decision.motif.valeur })} {decision.motif.operateur}{' '}
            {formaterNombre({ nombre: decision.motif.seuil })}
          </p>
        </article>
      ))}
      {resultat.ignorees.map((ignoree) => (
        <p
          key={ignoree.regleId}
          className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800"
        >
          {ignoree.regleNom} non évaluée : {ignoree.raison}
        </p>
      ))}
    </div>
  );
}
