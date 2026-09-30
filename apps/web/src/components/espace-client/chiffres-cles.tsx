import type { Indicateurs } from '@workflow/shared';
import { formaterValeur, indicateursPresents } from '@/lib/espace-client/indicateurs-client';

interface ChiffresClesProps {
  surfaceHa: number | null;
  indicateurs: Indicateurs;
}

/** Quelques chiffres clés en grand, avec une phrase d'aide pour chacun. */
export function ChiffresCles({ surfaceHa, indicateurs }: ChiffresClesProps) {
  const cartes = [
    ...(surfaceHa === null
      ? []
      : [
          {
            cle: 'surface',
            libelle: 'Surface',
            valeur: `${surfaceHa.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha`,
            aide: 'Surface mesurée à partir du contour GPS.',
          },
        ]),
    ...indicateursPresents({ indicateurs }).map((indicateur) => ({
      cle: indicateur.cle,
      libelle: indicateur.libelle,
      valeur: formaterValeur({ valeur: indicateurs[indicateur.cle] ?? 0, indicateur }),
      aide: indicateur.aide,
    })),
  ];
  return (
    <dl className="grid grid-cols-2 gap-3">
      {cartes.map((carte) => (
        <div key={carte.cle} className="rounded-xl bg-neutral-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {carte.libelle}
          </dt>
          <dd className="text-xl font-semibold text-neutral-900">{carte.valeur}</dd>
          <dd className="text-xs text-neutral-500">{carte.aide}</dd>
        </div>
      ))}
    </dl>
  );
}
