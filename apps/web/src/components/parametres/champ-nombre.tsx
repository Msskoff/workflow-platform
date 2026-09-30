'use client';

import { useState } from 'react';
import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { CLASSES_CHAMP, EtiquetteChamp } from './etiquette-champ';

interface ChampNombreProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  /** `undefined` quand le champ est vidé (paramètre facultatif). */
  surChangement: (params: { valeur: number | undefined }) => void;
}

/**
 * Saisie numérique. Le texte en cours de frappe (« - », « 1, ») est conservé localement
 * tant qu'il n'est pas un nombre complet ; la virgule décimale est acceptée.
 */
export function ChampNombre({ nom, schema, valeur, surChangement }: ChampNombreProps) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? (typeof valeur === 'number' ? String(valeur) : '');

  return (
    <EtiquetteChamp libelle={libelleChamp({ nom, schema })} description={schema.description}>
      <input
        type="text"
        inputMode="decimal"
        className={CLASSES_CHAMP}
        value={affiche}
        onChange={(evenement) => {
          const texte = evenement.target.value;
          setBrouillon(texte);
          if (texte.trim() === '') {
            surChangement({ valeur: undefined });
            return;
          }
          const nombre = Number(texte.replace(',', '.'));
          if (Number.isFinite(nombre)) {
            surChangement({ valeur: schema.type === 'integer' ? Math.trunc(nombre) : nombre });
          }
        }}
        onBlur={() => setBrouillon(null)}
      />
      {(schema.minimum !== undefined || schema.maximum !== undefined) && (
        <span className="block text-[11px] text-neutral-400">
          {schema.minimum !== undefined && `min ${schema.minimum}`}
          {schema.minimum !== undefined && schema.maximum !== undefined && ' · '}
          {schema.maximum !== undefined && `max ${schema.maximum}`}
        </span>
      )}
    </EtiquetteChamp>
  );
}
