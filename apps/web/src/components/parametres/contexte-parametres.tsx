'use client';

import type { DescripteurNoeud } from '@workflow/shared';
import { createContext, useContext } from 'react';

export type IndicateurDisponible = NonNullable<
  DescripteurNoeud['sorties'][string]['indicateurs']
>[number];

export interface ContexteParametres {
  /** Indicateurs publiés par les nœuds connectés en entrée du nœud édité. */
  indicateursDisponibles: readonly IndicateurDisponible[];
}

const Contexte = createContext<ContexteParametres>({ indicateursDisponibles: [] });

/** Fournit aux champs de paramètres ce qu'ils doivent savoir du graphe (indicateurs amont…). */
export const FournisseurParametres = Contexte.Provider;

export function useContexteParametres(): ContexteParametres {
  return useContext(Contexte);
}
