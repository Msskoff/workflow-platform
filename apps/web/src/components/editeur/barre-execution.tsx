'use client';

import type { Campagne, ExecutionWorkflow } from '@workflow/shared';
import type { ReactNode } from 'react';
import { LiensNavigation } from '@/components/navigation/liens-navigation';

const LIBELLES_STATUT_EXECUTION: Readonly<Record<ExecutionWorkflow['statut'], string>> = {
  en_attente: 'en attente',
  en_cours: 'en cours…',
  terminee: 'terminée',
  echouee: 'échouée',
};

interface BarreExecutionProps {
  campagnes: readonly Campagne[];
  campagneId: string;
  surChoixCampagne: (params: { campagneId: string }) => void;
  surCreationCampagneDemo: () => void;
  surLancement: () => void;
  enCours: boolean;
  execution: ExecutionWorkflow | null;
  /** Problèmes du graphe (validation locale) : empêchent de lancer l'exécution. */
  bloquants: readonly string[];
  /** Erreurs renvoyées par l'API au dernier essai : affichées, sans bloquer un nouvel essai. */
  erreurs: readonly string[];
  /** Raison du dernier refus de connexion dans l'éditeur. */
  messageConnexion: string | null;
  /** Nom du workflow ouvert (modèle chargé ou graphe libre). */
  nomWorkflow: string;
  surEnregistrementModele: () => void;
  /** Contenu affiché sous la barre (ex. formulaire d'enregistrement de modèle). */
  complement?: ReactNode;
}

/** Choix de la campagne, lancement de l'exécution et retours (erreurs, statut global). */
export function BarreExecution({
  campagnes,
  campagneId,
  surChoixCampagne,
  surCreationCampagneDemo,
  surLancement,
  enCours,
  execution,
  bloquants,
  erreurs,
  messageConnexion,
  nomWorkflow,
  surEnregistrementModele,
  complement,
}: BarreExecutionProps) {
  const executable = campagneId !== '' && bloquants.length === 0 && !enCours;
  const problemes = [...bloquants, ...erreurs];

  return (
    <div className="space-y-2 border-b border-neutral-200 bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <LiensNavigation actif="/editeur" />
        <h1 className="mr-auto truncate text-base font-semibold" title={nomWorkflow}>
          {nomWorkflow}
        </h1>
        <button
          type="button"
          onClick={surEnregistrementModele}
          className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
        >
          Enregistrer comme modèle
        </button>

        {campagnes.length > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            Campagne
            <select
              className="rounded border border-neutral-300 px-2 py-1"
              value={campagneId}
              onChange={(evenement) => surChoixCampagne({ campagneId: evenement.target.value })}
            >
              {campagnes.map((campagne) => (
                <option key={campagne.id} value={campagne.id}>
                  {campagne.nom}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button
            type="button"
            onClick={surCreationCampagneDemo}
            className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50"
          >
            Créer une campagne de démonstration
          </button>
        )}

        {execution && (
          <span className="text-sm text-neutral-600" data-statut-execution={execution.statut}>
            Exécution v{execution.version} : {LIBELLES_STATUT_EXECUTION[execution.statut]}
          </span>
        )}

        <button
          type="button"
          onClick={surLancement}
          disabled={!executable}
          className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {enCours ? 'Exécution…' : 'Exécuter'}
        </button>
      </div>

      {complement}
      {messageConnexion && (
        <p className="rounded bg-amber-50 px-3 py-1.5 text-sm text-amber-800" role="status">
          Connexion refusée : {messageConnexion}
        </p>
      )}
      {problemes.length > 0 && (
        <ul className="space-y-0.5 rounded bg-red-50 px-3 py-1.5 text-sm text-red-700" role="alert">
          {problemes.map((probleme) => (
            <li key={probleme}>{probleme}</li>
          ))}
        </ul>
      )}
      {execution?.statut === 'echouee' && execution.erreur && (
        <p className="rounded bg-red-50 px-3 py-1.5 text-sm text-red-700">{execution.erreur}</p>
      )}
    </div>
  );
}
