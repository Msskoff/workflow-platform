'use client';

import type { StatutDecision } from '@workflow/shared';
import { useState } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface ActionsDecisionProps {
  statut: StatutDecision;
  enCours: boolean;
  surValidation: () => void;
  surRejet: (params: { motif: string | undefined }) => void;
  surEnvoi: () => void;
}

/**
 * Actions possibles selon le statut : valider ou rejeter un brouillon, envoyer une décision
 * validée (avec confirmation, car c'est ce qui la rend visible au client).
 */
export function ActionsDecision({
  statut,
  enCours,
  surValidation,
  surRejet,
  surEnvoi,
}: ActionsDecisionProps) {
  const [rejetOuvert, setRejetOuvert] = useState(false);
  const [motif, setMotif] = useState('');
  const [confirmationEnvoi, setConfirmationEnvoi] = useState(false);

  if (statut === 'brouillon') {
    return rejetOuvert ? (
      <div className="space-y-1">
        <input
          type="text"
          className={CLASSES_CHAMP}
          placeholder="Motif du rejet (facultatif, usage interne)"
          value={motif}
          maxLength={500}
          onChange={(evenement) => setMotif(evenement.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={enCours}
            className="rounded bg-red-700 px-3 py-1 text-xs font-semibold text-white disabled:bg-neutral-300"
            onClick={() => surRejet({ motif: motif.trim() || undefined })}
          >
            Confirmer le rejet
          </button>
          <button type="button" className="text-xs underline" onClick={() => setRejetOuvert(false)}>
            Annuler
          </button>
        </div>
      </div>
    ) : (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={enCours}
          className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-300"
          onClick={surValidation}
        >
          Valider
        </button>
        <button
          type="button"
          disabled={enCours}
          className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          onClick={() => setRejetOuvert(true)}
        >
          Rejeter
        </button>
      </div>
    );
  }

  if (statut === 'validé') {
    return confirmationEnvoi ? (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-neutral-700">Le client verra cette décision dans son espace.</span>
        <button
          type="button"
          disabled={enCours}
          className="rounded bg-emerald-700 px-3 py-1 font-semibold text-white disabled:bg-neutral-300"
          onClick={surEnvoi}
        >
          Confirmer l’envoi
        </button>
        <button type="button" className="underline" onClick={() => setConfirmationEnvoi(false)}>
          Annuler
        </button>
      </div>
    ) : (
      <button
        type="button"
        disabled={enCours}
        className="rounded bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-800 disabled:bg-neutral-300"
        onClick={() => setConfirmationEnvoi(true)}
      >
        Envoyer au client
      </button>
    );
  }

  const messages: Partial<Record<StatutDecision, string>> = {
    envoyé: 'Visible dans l’espace client. Application à suivre dans « Suivi de campagne ».',
    appliqué: 'Appliquée : détail prévu/réel dans « Suivi de campagne ».',
    non_appliqué: 'Non appliquée : motif dans « Suivi de campagne ».',
    rejeté: 'Rejetée : jamais visible par le client.',
  };
  return <p className="text-xs text-neutral-500">{messages[statut]}</p>;
}
