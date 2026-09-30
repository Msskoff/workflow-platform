'use client';

/** Extrait du JSON Schema d'un paramètre, tel que produit par Zod. */
export interface SchemaParametre {
  type?: string;
  title?: string;
  minimum?: number;
  maximum?: number;
}

interface ChampParametreProps {
  nom: string;
  schema: SchemaParametre;
  valeur: unknown;
  surChangement: (params: { valeur: number }) => void;
}

/** Champ numérique d'un paramètre de nœud (les autres types viendront avec les vrais nœuds). */
export function ChampParametre({ nom, schema, valeur, surChangement }: ChampParametreProps) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-neutral-600">{schema.title ?? nom}</span>
      <input
        type="number"
        className="nodrag w-20 rounded border border-neutral-300 px-1.5 py-0.5 text-right"
        value={typeof valeur === 'number' ? valeur : ''}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.type === 'integer' ? 1 : 'any'}
        onChange={(evenement) => {
          const nombre = evenement.target.valueAsNumber;
          if (!Number.isNaN(nombre)) {
            surChangement({ valeur: nombre });
          }
        }}
      />
    </label>
  );
}
