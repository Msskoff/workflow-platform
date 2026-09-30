'use client';

import {
  libellesTypesVariable,
  nomVariableSchema,
  reference,
  typesVariable,
  type TypeVariable,
  type VariableWorkflow,
} from '@workflow/shared';
import { useState, type FormEvent } from 'react';

interface PanneauVariablesProps {
  variables: readonly VariableWorkflow[];
  surChangement: (params: { variables: VariableWorkflow[] }) => void;
}

/** Type de champ HTML pour saisir la valeur par défaut d'une variable. */
function typeChamp({ type }: { type: TypeVariable }): 'text' | 'number' | 'date' {
  return type === 'nombre' ? 'number' : type === 'date' ? 'date' : 'text';
}

/**
 * Variables d'entrée du workflow (paramètres de graphe) : déclarées ici, liées aux paramètres
 * des nœuds dans le panneau de droite. La valeur par défaut sert aux exécutions lancées depuis
 * l'éditeur ; un lot fournit ses propres valeurs.
 */
export function PanneauVariables({ variables, surChangement }: PanneauVariablesProps) {
  const [nom, setNom] = useState('');
  const [type, setType] = useState<TypeVariable>('texte');
  const [erreur, setErreur] = useState<string | null>(null);

  const ajouter = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    const verifie = nomVariableSchema.safeParse(nom);
    if (!verifie.success) {
      setErreur(verifie.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    if (variables.some((variable) => variable.nom === verifie.data)) {
      setErreur(`La variable ${reference({ nom: verifie.data })} existe déjà`);
      return;
    }
    surChangement({
      variables: [
        ...variables,
        { nom: verifie.data, type, libelle: '', obligatoire: true, valeurParDefaut: null },
      ],
    });
    setNom('');
    setErreur(null);
  };

  const modifier = ({ index, variable }: { index: number; variable: VariableWorkflow }) =>
    surChangement({
      variables: variables.map((existante, rang) => (rang === index ? variable : existante)),
    });

  return (
    <section className="space-y-1.5" aria-label="Variables du workflow">
      <h2 className="text-sm font-semibold">Variables</h2>
      <p className="text-[11px] text-neutral-500">
        Référencées dans les paramètres par <span className="font-mono">{'${nom}'}</span>.
      </p>
      {variables.map((variable, index) => (
        <div
          key={variable.nom}
          className="space-y-1 rounded border border-violet-200 bg-violet-50 p-1.5"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-mono text-xs font-semibold text-violet-900">
              {reference({ nom: variable.nom })}
            </span>
            <button
              type="button"
              onClick={() =>
                surChangement({ variables: variables.filter((_, rang) => rang !== index) })
              }
              className="text-[11px] text-red-700 underline"
            >
              Retirer
            </button>
          </div>
          <p className="text-[10px] text-neutral-600">{libellesTypesVariable[variable.type]}</p>
          <input
            value={variable.libelle}
            maxLength={80}
            placeholder="Libellé (affiché au lancement)"
            onChange={(evenement) =>
              modifier({ index, variable: { ...variable, libelle: evenement.target.value } })
            }
            className="w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-[11px]"
          />
          {variable.type !== 'fichier' && variable.type !== 'parcelle' && (
            <input
              type={typeChamp({ type: variable.type })}
              value={variable.valeurParDefaut ?? ''}
              placeholder="Valeur par défaut"
              onChange={(evenement) => {
                const brute = evenement.target.value;
                const valeurParDefaut =
                  brute === '' ? null : variable.type === 'nombre' ? Number(brute) : brute;
                modifier({ index, variable: { ...variable, valeurParDefaut } });
              }}
              className="w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-[11px]"
            />
          )}
          <label className="flex items-center gap-1 text-[11px] text-neutral-600">
            <input
              type="checkbox"
              checked={variable.obligatoire}
              onChange={(evenement) =>
                modifier({
                  index,
                  variable: { ...variable, obligatoire: evenement.target.checked },
                })
              }
            />
            Obligatoire
          </label>
        </div>
      ))}
      <form onSubmit={ajouter} className="space-y-1">
        <div className="flex gap-1">
          <input
            value={nom}
            onChange={(evenement) => setNom(evenement.target.value)}
            placeholder="dateDebut"
            aria-label="Nom de la nouvelle variable"
            className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 font-mono text-[11px]"
          />
          <select
            value={type}
            onChange={(evenement) => setType(evenement.target.value as TypeVariable)}
            aria-label="Type de la nouvelle variable"
            className="rounded border border-neutral-300 px-1 py-0.5 text-[11px]"
          >
            {typesVariable.map((candidat) => (
              <option key={candidat} value={candidat}>
                {candidat}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded border border-violet-300 px-2 py-0.5 text-[11px] text-violet-900 hover:bg-violet-50"
        >
          Ajouter la variable
        </button>
        {erreur && <p className="text-[11px] text-red-700">{erreur}</p>}
      </form>
    </section>
  );
}
