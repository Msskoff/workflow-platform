import { catalogueIndicateurs, type CleIndicateur, type Indicateurs } from '@workflow/shared';

interface VueIndicateursProps {
  indicateurs: Indicateurs;
}

/** Tableau des indicateurs chiffrés, avec libellés et unités du catalogue. */
export function VueIndicateurs({ indicateurs }: VueIndicateursProps) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
      {Object.entries(indicateurs).map(([cle, valeur]) => {
        const definition = catalogueIndicateurs[cle as CleIndicateur] as
          { libelle: string; unite: string } | undefined;
        return (
          <div key={cle} className="contents" data-indicateur={cle}>
            <dt className="text-neutral-600" title={cle}>
              {definition?.libelle ?? cle}
            </dt>
            <dd className="text-right font-mono">
              {valeur.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
              {definition?.unite ? ` ${definition.unite}` : ''}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
