'use client';

import { libelleChamp, libelleOption, type SchemaJson } from '@/lib/formulaire/schema-json';
import { CLASSES_CHAMP, EtiquetteChamp } from './etiquette-champ';

interface ChampChoixProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: string | number }) => void;
}

/** Liste de choix d'un paramètre `enum`, avec les libellés fournis par le nœud. */
export function ChampChoix({ nom, schema, valeur, surChangement }: ChampChoixProps) {
  const options = schema.enum ?? [];
  return (
    <EtiquetteChamp libelle={libelleChamp({ nom, schema })} description={schema.description}>
      <select
        className={CLASSES_CHAMP}
        value={String(valeur ?? '')}
        onChange={(evenement) => {
          const choisie = options.find((option) => String(option) === evenement.target.value);
          if (choisie !== undefined) {
            surChangement({ valeur: choisie });
          }
        }}
      >
        {options.map((option) => (
          <option key={String(option)} value={String(option)}>
            {libelleOption({ schema, valeur: option })}
          </option>
        ))}
      </select>
    </EtiquetteChamp>
  );
}
