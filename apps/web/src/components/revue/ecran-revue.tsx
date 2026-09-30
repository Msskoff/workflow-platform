'use client';

import { statutsDecision, type DecisionEnRevue, type ModifierDecision } from '@workflow/shared';
import { useCallback, useMemo, useState } from 'react';
import { ErreurApi, listerDecisionsEnRevue, modifierDecision } from '@/lib/api/api-navigateur';
import { CarteDecisionRevue } from './carte-decision-revue';
import { OngletsStatuts, type FiltreStatut } from './onglets-statuts';

interface EcranRevueProps {
  decisionsInitiales: DecisionEnRevue[];
}

/**
 * Revue interne des décisions produites par les exécutions. Par défaut, les brouillons
 * à valider. Rien n'est visible par le client tant qu'une décision n'est pas envoyée.
 */
export function EcranRevue({ decisionsInitiales }: EcranRevueProps) {
  const [decisions, setDecisions] = useState(decisionsInitiales);
  const [filtre, setFiltre] = useState<FiltreStatut>('brouillon');
  const [clientId, setClientId] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const clients = useMemo(
    () => [...new Map(decisions.map((element) => [element.client.id, element.client])).values()],
    [decisions],
  );
  const duClient = useMemo(
    () => decisions.filter((element) => clientId === '' || element.client.id === clientId),
    [decisions, clientId],
  );
  const comptes = useMemo(() => {
    const parStatut = Object.fromEntries(
      statutsDecision.map((statut) => [
        statut,
        duClient.filter((element) => element.decision.statut === statut).length,
      ]),
    );
    return { ...parStatut, tous: duClient.length } as Record<FiltreStatut, number>;
  }, [duClient]);
  const visibles = duClient.filter(
    (element) => filtre === 'tous' || element.decision.statut === filtre,
  );

  const recharger = useCallback(async () => {
    setDecisions(await listerDecisionsEnRevue({}));
  }, []);

  const modifier = useCallback(
    async ({ id, donnees }: { id: string; donnees: ModifierDecision }) => {
      setEnCours(id);
      setErreurs((existantes) =>
        Object.fromEntries(Object.entries(existantes).filter(([cle]) => cle !== id)),
      );
      try {
        const modifiee = await modifierDecision({ id, donnees });
        setDecisions((existantes) =>
          existantes.map((element) =>
            element.decision.id === id ? { ...element, decision: modifiee } : element,
          ),
        );
      } catch (erreur) {
        setErreurs((existantes) => ({
          ...existantes,
          [id]: erreur instanceof ErreurApi ? erreur.details.join(' ; ') : String(erreur),
        }));
      } finally {
        setEnCours(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OngletsStatuts
          actif={filtre}
          comptes={comptes}
          surChoix={({ statut }) => setFiltre(statut)}
        />
        <div className="flex items-center gap-2 text-sm">
          <select
            className="rounded border border-neutral-300 px-2 py-1"
            value={clientId}
            aria-label="Client"
            onChange={(evenement) => setClientId(evenement.target.value)}
          >
            <option value="">Tous les clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border border-neutral-300 px-2 py-1"
            onClick={() => void recharger()}
          >
            Actualiser
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Aucune décision dans cette catégorie.
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((element) => (
            <CarteDecisionRevue
              key={element.decision.id}
              element={element}
              enCours={enCours === element.decision.id}
              erreur={erreurs[element.decision.id] ?? null}
              surModification={({ donnees }) => void modifier({ id: element.decision.id, donnees })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
