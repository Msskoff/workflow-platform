'use client';

import {
  estObjet,
  libelleChamp,
  valeurInitiale,
  type SchemaJson,
  type ValeursObjet,
} from '@/lib/formulaire/schema-json';
import { GroupeChamps } from './groupe-champs';

interface ChampListeProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: ValeursObjet[] }) => void;
}

/** Liste d'objets (ex. historique cultural) : ajout, suppression, édition de chaque élément. */
export function ChampListe({ nom, schema, valeur, surChangement }: ChampListeProps) {
  const elements = Array.isArray(valeur) ? valeur.filter(estObjet) : [];
  const schemaElement = schema.items ?? { type: 'object' };
  const maximum = schema.maxItems ?? Infinity;

  return (
    <fieldset className="space-y-2 rounded border border-neutral-200 p-2">
      <legend className="px-1 text-xs font-semibold text-neutral-700">
        {libelleChamp({ nom, schema })} ({elements.length})
      </legend>
      {elements.map((element, index) => (
        <div key={index} className="space-y-1.5 rounded bg-neutral-50 p-2">
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[11px] text-red-700 underline"
              onClick={() =>
                surChangement({ valeur: elements.filter((_, rang) => rang !== index) })
              }
            >
              Retirer
            </button>
          </div>
          <GroupeChamps
            schema={schemaElement}
            valeur={element}
            surChangement={({ valeur: modifie }) =>
              surChangement({
                valeur: elements.map((existant, rang) => (rang === index ? modifie : existant)),
              })
            }
          />
        </div>
      ))}
      {elements.length < maximum && (
        <button
          type="button"
          className="w-full rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
          onClick={() => {
            const nouveau = valeurInitiale({ schema: schemaElement });
            surChangement({ valeur: [...elements, estObjet(nouveau) ? nouveau : {}] });
          }}
        >
          + Ajouter
        </button>
      )}
    </fieldset>
  );
}
