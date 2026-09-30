'use client';

import { useState } from 'react';
import type { IndicateurDisponible } from '@/components/parametres/contexte-parametres';
import { nouvelleRegle, type RegleEditee } from '@/lib/regles/regle-editee';
import { CarteRegle } from './carte-regle';

interface EditeurReglesProps {
  regles: readonly RegleEditee[];
  /** Indicateurs proposés dans les conditions. */
  indicateurs: readonly IndicateurDisponible[];
  surChangement: (params: { regles: RegleEditee[] }) => void;
  maximum?: number;
}

/**
 * Éditeur d'un jeu de règles métier : ajout, suppression, réordonnancement et édition
 * de chaque règle. Indépendant de l'éditeur de workflow : il ne connaît que les règles
 * et la liste des indicateurs disponibles.
 */
export function EditeurRegles({
  regles,
  indicateurs,
  surChangement,
  maximum = Infinity,
}: EditeurReglesProps) {
  const [derniereAjoutee, setDerniereAjoutee] = useState<string | null>(null);
  const actives = regles.filter((regle) => regle.active).length;

  const deplacer = ({ index, sens }: { index: number; sens: -1 | 1 }) => {
    const cible = index + sens;
    if (cible < 0 || cible >= regles.length) {
      return;
    }
    const copie = [...regles];
    [copie[index], copie[cible]] = [copie[cible] as RegleEditee, copie[index] as RegleEditee];
    surChangement({ regles: copie });
  };

  return (
    <section className="space-y-2" aria-label="Règles métier">
      <p className="text-[11px] text-neutral-500">
        {regles.length} règle(s), {actives} active(s). Une règle déclenchée devient une décision en
        brouillon, avec son explication et les valeurs qui l’ont motivée.
      </p>
      {regles.map((regle, index) => (
        <CarteRegle
          key={regle.id}
          regle={regle}
          indicateurs={indicateurs}
          ouverteParDefaut={regle.id === derniereAjoutee}
          surChangement={({ regle: modifiee }) =>
            surChangement({
              regles: regles.map((existante, rang) => (rang === index ? modifiee : existante)),
            })
          }
          surSuppression={() =>
            surChangement({ regles: regles.filter((_, rang) => rang !== index) })
          }
          surDeplacement={({ sens }) => deplacer({ index, sens })}
        />
      ))}
      {regles.length < maximum && (
        <button
          type="button"
          className="w-full rounded border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          onClick={() => {
            const regle = nouvelleRegle({ indicateur: indicateurs[0]?.cle ?? '' });
            setDerniereAjoutee(regle.id);
            surChangement({ regles: [...regles, regle] });
          }}
        >
          + Ajouter une règle
        </button>
      )}
    </section>
  );
}
