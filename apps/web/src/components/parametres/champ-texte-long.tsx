'use client';

import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { CLASSES_CHAMP, EtiquetteChamp } from './etiquette-champ';

interface ChampTexteLongProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: string }) => void;
}

export function ChampTexteLong({ nom, schema, valeur, surChangement }: ChampTexteLongProps) {
  return (
    <EtiquetteChamp libelle={libelleChamp({ nom, schema })} description={schema.description}>
      <textarea
        className={`${CLASSES_CHAMP} min-h-20 resize-y`}
        value={typeof valeur === 'string' ? valeur : ''}
        maxLength={schema.maxLength}
        onChange={(evenement) => surChangement({ valeur: evenement.target.value })}
      />
    </EtiquetteChamp>
  );
}
