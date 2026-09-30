'use client';

import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { CLASSES_CHAMP, EtiquetteChamp } from './etiquette-champ';

interface ChampTexteProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: string }) => void;
}

export function ChampTexte({ nom, schema, valeur, surChangement }: ChampTexteProps) {
  return (
    <EtiquetteChamp libelle={libelleChamp({ nom, schema })} description={schema.description}>
      <input
        type="text"
        className={CLASSES_CHAMP}
        value={typeof valeur === 'string' ? valeur : ''}
        maxLength={schema.maxLength}
        onChange={(evenement) => surChangement({ valeur: evenement.target.value })}
      />
    </EtiquetteChamp>
  );
}
