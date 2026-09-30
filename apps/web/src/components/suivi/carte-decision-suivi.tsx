'use client';

import type { DecisionSuivi, ModifierDecision } from '@workflow/shared';
import { useState } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';
import { BadgePriorite } from '@/components/regles/badge-priorite';
import { BadgeStatutDecision } from '@/components/revue/badge-statut-decision';
import { formaterJour } from '@/lib/suivi/format-suivi';
import { FormulaireReel } from './formulaire-reel';
import { TableauPrevuReel } from './tableau-prevu-reel';

type Mode = 'lecture' | 'reel' | 'non_applique';

interface CarteDecisionSuiviProps {
  element: DecisionSuivi;
  enCours: boolean;
  erreur: string | null;
  surModification: (params: { donnees: ModifierDecision }) => void;
}

/**
 * Une recommandation envoyée : prévu, réel et actions de suivi
 * (saisir l'application, déclarer non appliquée, corriger le réel).
 */
export function CarteDecisionSuivi({
  element,
  enCours,
  erreur,
  surModification,
}: CarteDecisionSuiviProps) {
  const { decision, analyse } = element;
  const [mode, setMode] = useState<Mode>('lecture');
  const [motif, setMotif] = useState('');

  const enregistrer = ({ donnees }: { donnees: ModifierDecision }) => {
    surModification({ donnees });
    setMode('lecture');
  };

  return (
    <article
      className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      data-decision-id={decision.id}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{decision.recommandation ?? 'Recommandation'}</h3>
          <p className="text-xs text-neutral-500">
            Analyse v{analyse.version}
            {decision.envoyeeLe &&
              ` · envoyée le ${new Date(decision.envoyeeLe).toLocaleDateString('fr-FR')}`}
            {decision.applicationDeclareePar === 'espace_client' &&
              ' · cochée « fait » dans l’espace client'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {decision.priorite && <BadgePriorite priorite={decision.priorite} />}
          <BadgeStatutDecision statut={decision.statut} />
        </div>
      </header>

      <TableauPrevuReel decision={decision} />

      {decision.statut === 'non_appliqué' && decision.motifNonApplication && (
        <p className="text-xs text-neutral-700">
          <span className="font-semibold">Non appliquée</span>
          {decision.nonAppliqueeLe &&
            ` (${formaterJour({ date: decision.nonAppliqueeLe.slice(0, 10) })})`}{' '}
          : {decision.motifNonApplication}
        </p>
      )}

      {mode === 'reel' && (
        <FormulaireReel
          decision={decision}
          enCours={enCours}
          libelleAction={
            decision.statut === 'appliqué' ? 'Enregistrer le réel' : 'Marquer appliquée'
          }
          surAnnulation={() => setMode('lecture')}
          surEnregistrement={({ reel }) =>
            enregistrer({
              donnees: decision.statut === 'appliqué' ? { reel } : { statut: 'appliqué', reel },
            })
          }
        />
      )}

      {mode === 'non_applique' && (
        <div className="space-y-1">
          <input
            className={CLASSES_CHAMP}
            placeholder="Pourquoi n’a-t-elle pas été appliquée ? (obligatoire, usage interne)"
            value={motif}
            maxLength={500}
            onChange={(evenement) => setMotif(evenement.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={enCours || motif.trim() === ''}
              className="rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white disabled:bg-neutral-300"
              onClick={() =>
                enregistrer({
                  donnees: { statut: 'non_appliqué', motifNonApplication: motif.trim() },
                })
              }
            >
              Confirmer
            </button>
            <button type="button" className="text-xs underline" onClick={() => setMode('lecture')}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {mode === 'lecture' && (
        <footer className="flex flex-wrap gap-2 border-t border-neutral-100 pt-2">
          {decision.statut === 'envoyé' && (
            <>
              <button
                type="button"
                disabled={enCours}
                onClick={() => setMode('reel')}
                className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-300"
              >
                Saisir l’application
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => setMode('non_applique')}
                className="rounded border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
              >
                Non appliquée
              </button>
            </>
          )}
          {decision.statut === 'appliqué' && (
            <>
              <button
                type="button"
                disabled={enCours}
                onClick={() => setMode('reel')}
                className="rounded border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                {decision.reel ? 'Corriger le réel' : 'Saisir le réel'}
              </button>
              {!decision.reel && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => surModification({ donnees: { statut: 'envoyé' } })}
                  className="text-xs underline"
                >
                  Annuler l’application
                </button>
              )}
            </>
          )}
          {decision.statut === 'non_appliqué' && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => setMode('reel')}
              className="rounded border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Appliquée finalement
            </button>
          )}
        </footer>
      )}
      {erreur && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erreur}</p>}
    </article>
  );
}
