'use client';

import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';

interface ChampBooleenProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: boolean }) => void;
}

export function ChampBooleen({ nom, schema, valeur, surChangement }: ChampBooleenProps) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-emerald-700"
        checked={valeur === true}
        onChange={(evenement) => surChangement({ valeur: evenement.target.checked })}
      />
      <span>
        <span className="block text-xs font-medium text-neutral-700">
          {libelleChamp({ nom, schema })}
        </span>
        {schema.description && (
          <span className="block text-[11px] text-neutral-500">{schema.description}</span>
        )}
      </span>
    </label>
  );
}
