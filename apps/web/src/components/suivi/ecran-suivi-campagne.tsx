'use client';

import {
  calculerIndicateursSuivi,
  type DecisionSuivi,
  type ModifierDecision,
  type StatutDecision,
} from '@workflow/shared';
import { useCallback, useMemo, useState } from 'react';
import { ErreurApi, modifierDecision } from '@/lib/api/api-navigateur';
import { CarteDecisionSuivi } from './carte-decision-suivi';
import { IndicateursSuivi } from './indicateurs-suivi';

const SECTIONS: readonly { statut: StatutDecision; titre: string; vide: string }[] = [
  { statut: 'envoyé', titre: 'Reste à faire', vide: 'Tout ce qui a été conseillé est traité.' },
  {
    statut: 'appliqué',
    titre: 'Appliqué',
    vide: 'Aucune recommandation appliquée pour le moment.',
  },
  { statut: 'non_appliqué', titre: 'Non appliqué', vide: 'Aucune.' },
];

interface EcranSuiviCampagneProps {
  decisionsInitiales: DecisionSuivi[];
}

/**
 * Suivi d'une campagne : indicateurs, puis les recommandations envoyées classées en
 * « reste à faire », « appliqué » et « non appliqué ». Les indicateurs sont recalculés
 * localement (même fonction partagée que l'API) après chaque action.
 */
export function EcranSuiviCampagne({ decisionsInitiales }: EcranSuiviCampagneProps) {
  const [decisions, setDecisions] = useState(decisionsInitiales);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const indicateurs = useMemo(
    () => calculerIndicateursSuivi({ decisions: decisions.map((element) => element.decision) }),
    [decisions],
  );

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
    <div className="space-y-6">
      <IndicateursSuivi indicateurs={indicateurs} />
      {SECTIONS.map((section) => {
        const elements = decisions.filter((element) => element.decision.statut === section.statut);
        return (
          <section key={section.statut} className="space-y-2" data-section={section.statut}>
            <h2 className="text-base font-semibold">
              {section.titre} <span className="text-neutral-500">({elements.length})</span>
            </h2>
            {elements.length === 0 ? (
              <p className="text-sm text-neutral-500">{section.vide}</p>
            ) : (
              elements.map((element) => (
                <CarteDecisionSuivi
                  key={element.decision.id}
                  element={element}
                  enCours={enCours === element.decision.id}
                  erreur={erreurs[element.decision.id] ?? null}
                  surModification={({ donnees }) =>
                    void modifier({ id: element.decision.id, donnees })
                  }
                />
              ))
            )}
          </section>
        );
      })}
      {indicateurs.enPreparation > 0 && (
        <p className="text-sm text-neutral-500">
          {indicateurs.enPreparation} décision(s) en préparation : à valider et envoyer depuis
          l’écran de revue.
        </p>
      )}
    </div>
  );
}
