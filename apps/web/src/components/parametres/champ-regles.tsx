'use client';

import { EditeurRegles } from '@/components/regles/editeur-regles';
import { libelleChamp, type SchemaJson, type ValeursObjet } from '@/lib/formulaire/schema-json';
import { versRegleEditee } from '@/lib/regles/regle-editee';
import { useContexteParametres } from './contexte-parametres';

interface ChampReglesProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: ValeursObjet[] }) => void;
}

/** Paramètre « règles » d'un nœud : branche l'éditeur de règles sur les indicateurs amont. */
export function ChampRegles({ nom, schema, valeur, surChangement }: ChampReglesProps) {
  const { indicateursDisponibles } = useContexteParametres();
  const regles = (Array.isArray(valeur) ? valeur : []).map((brute, rang) =>
    versRegleEditee({ valeur: brute, rang }),
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-neutral-700">
        {libelleChamp({ nom, schema })}
      </legend>
      {indicateursDisponibles.length === 0 && (
        <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          Connectez des indicateurs (surface, NDVI, zonage…) en entrée pour les choisir dans une
          liste.
        </p>
      )}
      <EditeurRegles
        regles={regles}
        indicateurs={indicateursDisponibles}
        maximum={schema.maxItems}
        surChangement={({ regles: modifiees }) =>
          // Un seuil vide est omis : le serveur le signalera comme manquant.
          surChangement({
            valeur: modifiees.map((regle) => JSON.parse(JSON.stringify(regle)) as ValeursObjet),
          })
        }
      />
    </fieldset>
  );
}
