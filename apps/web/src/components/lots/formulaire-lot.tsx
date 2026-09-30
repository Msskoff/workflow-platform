'use client';

import type {
  Campagne,
  Client,
  Parcelle,
  ResumeModele,
  ValeursVariables,
  VariableWorkflow,
} from '@workflow/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { creerLot, ErreurApi, lireModele } from '@/lib/api/api-navigateur';
import { ChampVariableLot } from './champ-variable-lot';

interface FormulaireLotProps {
  modeles: readonly ResumeModele[];
  clients: readonly Client[];
  parcelles: readonly Parcelle[];
  campagnes: readonly Campagne[];
}

/**
 * Lancement d'un lot : un modèle, ses variables communes (image, période…) et les parcelles.
 * Les variables « parcelle » sont remplies automatiquement pour chaque parcelle.
 */
export function FormulaireLot({ modeles, clients, parcelles, campagnes }: FormulaireLotProps) {
  const router = useRouter();
  const [modeleId, setModeleId] = useState('');
  const [variables, setVariables] = useState<VariableWorkflow[]>([]);
  const [valeurs, setValeurs] = useState<ValeursVariables>({});
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const avecCampagne = new Set(campagnes.map((campagne) => campagne.parcelleId));
  const communes = variables.filter((variable) => variable.type !== 'parcelle');

  const choisirModele = async ({ id }: { id: string }) => {
    setModeleId(id);
    setValeurs({});
    setErreurs([]);
    setVariables(id ? (await lireModele({ id })).graphe.variables : []);
  };

  const basculer = ({ ids, cochee }: { ids: readonly string[]; cochee: boolean }) =>
    setSelection((actuelle) => {
      const suivante = new Set(actuelle);
      ids.forEach((id) => (cochee ? suivante.add(id) : suivante.delete(id)));
      return suivante;
    });

  const lancer = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setEnvoi(true);
    setErreurs([]);
    try {
      const lot = await creerLot({
        donnees: { modeleId, parcelleIds: [...selection], valeurs },
      });
      router.push(`/lots/${lot.id}`);
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? erreur.details : [String(erreur)]);
      setEnvoi(false);
    }
  };

  return (
    <form
      onSubmit={(evenement) => void lancer(evenement)}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="text-base font-semibold">Nouveau lot</h2>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-neutral-700">Modèle de workflow</span>
        <select
          required
          value={modeleId}
          onChange={(evenement) => void choisirModele({ id: evenement.target.value })}
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="">Choisir un modèle…</option>
          {modeles.map((modele) => (
            <option key={modele.id} value={modele.id}>
              {modele.nom}
            </option>
          ))}
        </select>
      </label>

      {modeleId && !variables.some((variable) => variable.type === 'parcelle') && (
        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
          Ce modèle n’a pas de variable « parcelle » : il sera exécuté à l’identique sur chaque
          campagne. Préférez un modèle qui lit le contour par {'${parcelleId}'}.
        </p>
      )}

      {communes.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Variables communes à toutes les parcelles
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {communes.map((variable) => (
              <ChampVariableLot
                key={variable.nom}
                variable={variable}
                valeur={valeurs[variable.nom]}
                surChangement={({ valeur }) =>
                  setValeurs((actuelles) => {
                    const autres = Object.fromEntries(
                      Object.entries(actuelles).filter(([nom]) => nom !== variable.nom),
                    );
                    return valeur === undefined ? autres : { ...autres, [variable.nom]: valeur };
                  })
                }
              />
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Parcelles ({selection.size} sélectionnée(s))
        </legend>
        {clients.map((client) => {
          const siennes = parcelles.filter((parcelle) => parcelle.clientId === client.id);
          if (siennes.length === 0) {
            return null;
          }
          const ids = siennes.map((parcelle) => parcelle.id);
          return (
            <div key={client.id} className="space-y-1 rounded border border-neutral-200 p-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={ids.every((id) => selection.has(id))}
                  onChange={(evenement) => basculer({ ids, cochee: evenement.target.checked })}
                />
                {client.nom}
              </label>
              <ul className="ml-6 space-y-0.5">
                {siennes.map((parcelle) => (
                  <li key={parcelle.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selection.has(parcelle.id)}
                        onChange={(evenement) =>
                          basculer({ ids: [parcelle.id], cochee: evenement.target.checked })
                        }
                      />
                      {parcelle.nom}
                      <span className="text-xs text-neutral-500">
                        {parcelle.surfaceHa.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}{' '}
                        ha
                      </span>
                      {!avecCampagne.has(parcelle.id) && (
                        <span className="text-xs text-amber-700">sans campagne : échouera</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </fieldset>

      {erreurs.length > 0 && (
        <ul className="space-y-0.5 rounded bg-red-50 px-3 py-1.5 text-sm text-red-700" role="alert">
          {erreurs.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={envoi || !modeleId || selection.size === 0}
        className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-300"
      >
        {envoi ? 'Lancement…' : `Lancer sur ${selection.size} parcelle(s)`}
      </button>
    </form>
  );
}
