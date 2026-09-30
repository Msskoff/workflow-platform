'use client';

import { estObjet, libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { ChampBooleen } from './champ-booleen';
import { ChampChoix } from './champ-choix';
import { ChampListe } from './champ-liste';
import { ChampNombre } from './champ-nombre';
import { ChampPhotos } from './champ-photos';
import { ChampRegles } from './champ-regles';
import { ChampTexte } from './champ-texte';
import { ChampTexteLong } from './champ-texte-long';
import { GroupeChamps } from './groupe-champs';

interface ChampSchemaProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: unknown }) => void;
}

/** Choisit le champ de saisie adapté au schéma d'un paramètre. */
export function ChampSchema({ nom, schema, valeur, surChangement }: ChampSchemaProps) {
  if (schema.widget === 'masque') {
    return null;
  }
  if (schema.widget === 'regles') {
    return <ChampRegles nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />;
  }
  if (schema.widget === 'photos') {
    return <ChampPhotos nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />;
  }
  if (schema.widget === 'texte-long') {
    return (
      <ChampTexteLong nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />
    );
  }
  if (schema.enum) {
    return <ChampChoix nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />;
  }

  switch (schema.type) {
    case 'boolean':
      return (
        <ChampBooleen nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />
      );
    case 'number':
    case 'integer':
      return (
        <ChampNombre nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />
      );
    case 'array':
      return <ChampListe nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />;
    case 'object':
      return (
        <fieldset className="space-y-2 rounded border border-neutral-200 p-2">
          <legend className="px-1 text-xs font-semibold text-neutral-700">
            {libelleChamp({ nom, schema })}
          </legend>
          <GroupeChamps
            schema={schema}
            valeur={estObjet(valeur) ? valeur : {}}
            surChangement={surChangement}
          />
        </fieldset>
      );
    default:
      return <ChampTexte nom={nom} schema={schema} valeur={valeur} surChangement={surChangement} />;
  }
}
