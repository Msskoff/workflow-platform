'use client';

import type { DecisionEnRevue, ModifierDecision } from '@workflow/shared';
import { BadgePriorite } from '@/components/regles/badge-priorite';
import { FormulairePrevu } from '@/components/suivi/formulaire-prevu';
import { TableauPrevuReel } from '@/components/suivi/tableau-prevu-reel';
import { ActionsDecision } from './actions-decision';
import { BadgeStatutDecision } from './badge-statut-decision';
import { DonneesSources } from './donnees-sources';
import { EditeurExplication } from './editeur-explication';
import { LienApercuRapport } from './lien-apercu-rapport';

function dateCourte({ iso }: { iso: string | null }): string | null {
  return iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;
}

interface CarteDecisionRevueProps {
  element: DecisionEnRevue;
  enCours: boolean;
  erreur: string | null;
  surModification: (params: { donnees: ModifierDecision }) => void;
}

/** Une décision à revoir : contexte, recommandation, pourquoi, données sources et actions. */
export function CarteDecisionRevue({
  element,
  enCours,
  erreur,
  surModification,
}: CarteDecisionRevueProps) {
  const { decision, client, parcelle, campagne, execution, chaine } = element;
  const jalons = [
    { libelle: 'Produite', date: dateCourte({ iso: decision.creeLe }) },
    { libelle: 'Validée', date: dateCourte({ iso: decision.valideeLe }) },
    { libelle: 'Envoyée', date: dateCourte({ iso: decision.envoyeeLe }) },
    { libelle: 'Appliquée', date: dateCourte({ iso: decision.appliqueeLe }) },
    { libelle: 'Non appliquée', date: dateCourte({ iso: decision.nonAppliqueeLe }) },
    { libelle: 'Rejetée', date: dateCourte({ iso: decision.rejeteeLe }) },
  ].filter((jalon) => jalon.date);

  return (
    <article
      className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      data-decision-id={decision.id}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-500">
            {client.nom} · {parcelle.nom} ({parcelle.surfaceHa.toLocaleString('fr-FR')} ha) ·{' '}
            {campagne.nom}
          </p>
          <h2 className="text-base font-semibold">
            {decision.recommandation ?? 'Décision sans recommandation'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {decision.priorite && <BadgePriorite priorite={decision.priorite} />}
          <BadgeStatutDecision statut={decision.statut} />
        </div>
      </header>

      <EditeurExplication
        explication={decision.explication}
        modifiable={decision.statut === 'brouillon'}
        enCours={enCours}
        surEnregistrement={({ explication }) => surModification({ donnees: { explication } })}
      />

      <DonneesSources donnees={decision.donnees} chaine={chaine} />

      {decision.statut === 'brouillon' || decision.statut === 'validé' ? (
        <FormulairePrevu
          key={decision.modifieLe}
          prevu={decision.prevu}
          enCours={enCours}
          surEnregistrement={({ prevu }) => surModification({ donnees: { prevu } })}
        />
      ) : (
        decision.statut !== 'rejeté' && <TableauPrevuReel decision={decision} />
      )}

      {decision.motifRejet && (
        <p className="text-xs text-neutral-600">Motif du rejet : {decision.motifRejet}</p>
      )}

      <footer className="flex flex-wrap items-end justify-between gap-2 border-t border-neutral-100 pt-2">
        <p className="text-[11px] text-neutral-500">
          {execution.workflowNom} v{execution.version}
          {jalons.map((jalon) => ` · ${jalon.libelle} ${jalon.date}`).join('')}
          <br />
          <LienApercuRapport executionId={execution.id} />
        </p>
        <ActionsDecision
          statut={decision.statut}
          enCours={enCours}
          surValidation={() => surModification({ donnees: { statut: 'validé' } })}
          surRejet={({ motif }) =>
            surModification({ donnees: { statut: 'rejeté', motifRejet: motif } })
          }
          surEnvoi={() => surModification({ donnees: { statut: 'envoyé' } })}
        />
      </footer>
      {erreur && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erreur}</p>}
    </article>
  );
}
