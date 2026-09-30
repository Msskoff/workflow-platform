import type { ReactNode } from 'react';

interface EtiquetteChampProps {
  libelle: string;
  description?: string;
  children: ReactNode;
}

/** Libellé, champ de saisie et aide éventuelle d'un paramètre. */
export function EtiquetteChamp({ libelle, description, children }: EtiquetteChampProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-700">{libelle}</span>
      {children}
      {description && <span className="block text-[11px] text-neutral-500">{description}</span>}
    </label>
  );
}

/** Classes communes des champs de saisie du panneau. */
export const CLASSES_CHAMP =
  'w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm focus:border-emerald-600 focus:outline-none';
