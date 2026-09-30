'use client';

import { libellesStatutsLot, type Lot } from '@workflow/shared';
import { useEffect, useState } from 'react';
import { ErreurApi, lireLot, relancerEchecsLot } from '@/lib/api/api-navigateur';
import { BadgeStatutTache } from './badge-statut-tache';
import { BarreProgression } from './barre-progression';

/** Rafraîchissement tant que le lot tourne. */
const INTERVALLE_MS = 2_000;

interface SuiviLotProps {
  lotInitial: Lot;
}

/**
 * Suivi d'un lot : progression, statut de chaque parcelle (tentatives, erreur, prochaine
 * relance automatique) et relance manuelle des échecs. Mis à jour toutes les 2 s tant qu'il
 * reste des tâches à traiter.
 */
export function SuiviLot({ lotInitial }: SuiviLotProps) {
  const [lot, setLot] = useState(lotInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [relanceEnCours, setRelanceEnCours] = useState(false);
  const enCours = lot.statut === 'en_cours';

  useEffect(() => {
    if (!enCours) {
      return;
    }
    const minuterie = setInterval(() => {
      lireLot({ id: lot.id }).then(setLot, () => undefined);
    }, INTERVALLE_MS);
    return () => clearInterval(minuterie);
  }, [enCours, lot.id]);

  const relancer = async () => {
    setRelanceEnCours(true);
    setErreur(null);
    try {
      setLot(await relancerEchecsLot({ id: lot.id }));
    } catch (probleme) {
      setErreur(probleme instanceof ErreurApi ? probleme.details.join(' ; ') : String(probleme));
    } finally {
      setRelanceEnCours(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{libellesStatutsLot[lot.statut]}</span>
            <span className="text-neutral-500"> · modèle « {lot.modele.nom} »</span>
          </p>
          {lot.progression.echouees > 0 && !enCours && (
            <button
              type="button"
              disabled={relanceEnCours}
              onClick={() => void relancer()}
              className="rounded bg-emerald-700 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-300"
            >
              Relancer les échecs ({lot.progression.echouees})
            </button>
          )}
        </div>
        <BarreProgression progression={lot.progression} />
        {Object.keys(lot.valeurs).length > 0 && (
          <p className="text-xs text-neutral-500">
            Variables :{' '}
            {Object.entries(lot.valeurs)
              .map(([nom, valeur]) => `${nom} = ${valeur}`)
              .join(' · ')}
          </p>
        )}
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      </section>

      <table className="w-full rounded-lg border border-neutral-200 bg-white text-sm">
        <thead className="text-left text-[11px] uppercase text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th className="p-2 font-medium">Parcelle</th>
            <th className="p-2 font-medium">Campagne</th>
            <th className="p-2 font-medium">Statut</th>
            <th className="p-2 text-right font-medium">Tentatives</th>
            <th className="p-2 font-medium">Détail</th>
          </tr>
        </thead>
        <tbody>
          {lot.taches.map((tache) => (
            <tr
              key={tache.id}
              className="border-b border-neutral-100 align-top"
              data-tache={tache.id}
            >
              <td className="p-2">
                <p className="font-medium">{tache.parcelle.nom}</p>
                <p className="text-xs text-neutral-500">{tache.client.nom}</p>
              </td>
              <td className="p-2 text-xs">{tache.campagne?.nom ?? '—'}</td>
              <td className="p-2">
                <BadgeStatutTache statut={tache.statut} />
              </td>
              <td className="p-2 text-right tabular-nums text-xs">
                {tache.tentatives}/{tache.maxTentatives}
              </td>
              <td className="p-2 text-xs">
                {tache.erreur && <p className="text-red-700">{tache.erreur}</p>}
                {tache.statut === 'en_attente' &&
                  tache.prochaineTentativeLe &&
                  tache.tentatives > 0 && (
                    <p className="text-neutral-500">
                      Nouvelle tentative à{' '}
                      {new Date(tache.prochaineTentativeLe).toLocaleTimeString('fr-FR')}
                    </p>
                  )}
                {tache.statut === 'reussie' && (
                  <p className="text-emerald-800">Décisions à revoir dans la revue.</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
