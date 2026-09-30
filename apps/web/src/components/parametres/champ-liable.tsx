'use client';

import { reference, referenceSeule } from '@workflow/shared';
import type { ReactNode } from 'react';
import { useContexteParametres } from './contexte-parametres';
import { CLASSES_CHAMP } from './etiquette-champ';

interface ChampLiableProps {
  /** Libellé du paramètre, affiché quand il est lié à une variable. */
  libelle: string;
  valeur: unknown;
  surChangement: (params: { valeur: unknown }) => void;
  /** Champ de saisie normal, affiché quand le paramètre n'est pas lié. */
  children: ReactNode;
}

/**
 * Paramètre de premier niveau d'un nœud, liable à une variable du workflow : la valeur devient
 * `${nom}` et sera remplacée à chaque exécution (ex. `${parcelleId}` dans un lot).
 */
export function ChampLiable({ libelle, valeur, surChangement, children }: ChampLiableProps) {
  const { variables } = useContexteParametres();
  const liee = referenceSeule({ valeur });

  if (liee === null) {
    if (variables.length === 0) {
      return children;
    }
    return (
      <div className="space-y-1">
        {children}
        <select
          value=""
          aria-label={`Lier « ${libelle} » à une variable`}
          onChange={(evenement) =>
            evenement.target.value &&
            surChangement({ valeur: reference({ nom: evenement.target.value }) })
          }
          className="w-full rounded border border-dashed border-neutral-300 bg-white px-1 py-0.5 text-[11px] text-neutral-500"
        >
          <option value="">Lier à une variable…</option>
          {variables.map((variable) => (
            <option key={variable.nom} value={variable.nom}>
              {reference({ nom: variable.nom })}
              {variable.libelle ? ` — ${variable.libelle}` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const declaree = variables.some((variable) => variable.nom === liee);
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-neutral-700">{libelle}</span>
      <div className="flex items-center gap-1">
        <select
          value={liee}
          onChange={(evenement) =>
            surChangement({ valeur: reference({ nom: evenement.target.value }) })
          }
          className={`${CLASSES_CHAMP} font-mono ${declaree ? 'bg-violet-50' : 'border-red-400 bg-red-50'}`}
          aria-label={`Variable liée à « ${libelle} »`}
        >
          {!declaree && <option value={liee}>{reference({ nom: liee })} (non déclarée)</option>}
          {variables.map((variable) => (
            <option key={variable.nom} value={variable.nom}>
              {reference({ nom: variable.nom })}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => surChangement({ valeur: undefined })}
          className="shrink-0 text-[11px] underline"
        >
          Délier
        </button>
      </div>
    </div>
  );
}
