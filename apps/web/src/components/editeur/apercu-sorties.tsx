import {
  geometrieGeoreferenceeSchema,
  rapportQualiteSchema,
  typesDonnees,
  type DescripteurNoeud,
  type EtatNoeud,
} from '@workflow/shared';
import { VueRapportQualite } from './vue-rapport-qualite';

interface ApercuValeurProps {
  type: DescripteurNoeud['sorties'][string]['type'];
  valeur: unknown;
}

/** Affichage adapté au type de données : rapport lisible, résumé de géométrie, sinon JSON. */
function ApercuValeur({ type, valeur }: ApercuValeurProps) {
  if (type === 'rapport_qualite') {
    const rapport = rapportQualiteSchema.safeParse(valeur);
    if (rapport.success) {
      return <VueRapportQualite rapport={rapport.data} />;
    }
  }
  if (type === 'geometrie') {
    const geometrie = geometrieGeoreferenceeSchema.safeParse(valeur);
    if (geometrie.success) {
      const { crs, geometrie: forme } = geometrie.data;
      const sommets = (forme.type === 'Polygon' ? [forme.coordinates] : forme.coordinates)
        .flat()
        .reduce((total, anneau) => total + anneau.length, 0);
      return (
        <details className="text-xs">
          <summary className="cursor-pointer">
            {forme.type} · {sommets} positions · <span className="font-mono">{crs}</span>
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
            {JSON.stringify(forme, null, 1)}
          </pre>
        </details>
      );
    }
  }
  if (typeof valeur === 'object' && valeur !== null) {
    return (
      <pre className="max-h-48 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
        {JSON.stringify(valeur, null, 2)}
      </pre>
    );
  }
  return <span className="font-mono text-xs">{JSON.stringify(valeur)}</span>;
}

interface ApercuSortiesProps {
  descripteur: DescripteurNoeud;
  etat: EtatNoeud;
}

/** Sorties produites par un nœud lors de la dernière exécution. */
export function ApercuSorties({ descripteur, etat }: ApercuSortiesProps) {
  if (etat.statut === 'erreur') {
    return <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{etat.erreur}</p>;
  }
  if (etat.statut !== 'ok' || !etat.sorties) {
    return <p className="text-xs text-neutral-500">Pas encore de résultat.</p>;
  }
  return (
    <div className="space-y-3">
      {Object.entries(descripteur.sorties).map(([nom, port]) => (
        <div key={nom} className="space-y-1">
          <div className="text-xs font-medium text-neutral-700">
            {port.libelle}{' '}
            <span className="rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">
              {typesDonnees[port.type].libelle}
            </span>
          </div>
          <ApercuValeur type={port.type} valeur={etat.sorties?.[nom]} />
        </div>
      ))}
    </div>
  );
}
