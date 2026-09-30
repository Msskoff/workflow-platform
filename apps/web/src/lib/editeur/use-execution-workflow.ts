'use client';

import type { ExecutionWorkflow, StatutExecution, WorkflowSnapshot } from '@workflow/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  creerExecution,
  ErreurApi,
  lancerExecution,
  lireExecution,
} from '@/lib/api/api-navigateur';

const DELAI_SUIVI_MS = 400;
const STATUTS_FINAUX: readonly StatutExecution[] = ['terminee', 'echouee'];

function attendre({ ms }: { ms: number }): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface LancerExecutionParams {
  campagneId: string;
  snapshot: WorkflowSnapshot;
}

/**
 * Crée une exécution, la lance, puis suit son avancement par polling jusqu'à un statut final.
 * `execution.noeuds` porte le statut de chaque nœud, affiché dans l'éditeur.
 */
export function useExecutionWorkflow() {
  const [execution, setExecution] = useState<ExecutionWorkflow | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);
  const monte = useRef(true);

  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  const lancer = useCallback(async ({ campagneId, snapshot }: LancerExecutionParams) => {
    setEnCours(true);
    setErreurs([]);
    setExecution(null);
    try {
      const creee = await creerExecution({ campagneId, snapshot });
      let courante = await lancerExecution({ id: creee.id });
      setExecution(courante);
      while (monte.current && !STATUTS_FINAUX.includes(courante.statut)) {
        await attendre({ ms: DELAI_SUIVI_MS });
        courante = await lireExecution({ id: creee.id });
        if (monte.current) {
          setExecution(courante);
        }
      }
    } catch (erreur) {
      setErreurs(
        erreur instanceof ErreurApi
          ? erreur.details
          : [erreur instanceof Error ? erreur.message : String(erreur)],
      );
    } finally {
      setEnCours(false);
    }
  }, []);

  /** Oublie la dernière exécution (ex. après le chargement d'un autre workflow). */
  const reinitialiser = useCallback(() => {
    setExecution(null);
    setErreurs([]);
  }, []);

  return { execution, erreurs, enCours, lancer, reinitialiser };
}
