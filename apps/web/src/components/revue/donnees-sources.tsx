import { formaterNombre, libelleIndicateur, type DecisionEnRevue } from '@workflow/shared';

interface DonneesSourcesProps {
  donnees: DecisionEnRevue['decision']['donnees'];
  chaine: DecisionEnRevue['chaine'];
}

function nombre({ valeur }: { valeur: unknown }): string {
  return typeof valeur === 'number' ? formaterNombre({ nombre: valeur }) : String(valeur ?? '—');
}

/**
 * Ce qui a motivé la décision : la mesure, la condition de la règle, le nœud source,
 * et la chaîne des nœuds qui l'ont produite.
 */
export function DonneesSources({ donnees, chaine }: DonneesSourcesProps) {
  const indicateur = typeof donnees?.indicateur === 'string' ? donnees.indicateur : null;
  const source =
    donnees?.source && typeof donnees.source === 'object' && !Array.isArray(donnees.source)
      ? (donnees.source as { noeudId?: string })
      : null;
  const libelleSource = chaine.find((maillon) => maillon.noeudId === source?.noeudId)?.libelle;

  return (
    <div className="space-y-2 rounded bg-neutral-50 p-2 text-xs">
      {indicateur ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt className="text-neutral-500">Règle</dt>
          <dd>{String(donnees?.regleNom ?? donnees?.regleId ?? '—')}</dd>
          <dt className="text-neutral-500">Mesure</dt>
          <dd>
            {libelleIndicateur({ cle: indicateur })} ={' '}
            <strong className="font-mono">{nombre({ valeur: donnees?.valeur })}</strong>
          </dd>
          <dt className="text-neutral-500">Condition</dt>
          <dd className="font-mono">
            {String(donnees?.operateur ?? '')} {nombre({ valeur: donnees?.seuil })}
          </dd>
          {libelleSource && (
            <>
              <dt className="text-neutral-500">Calculée par</dt>
              <dd>{libelleSource}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-neutral-500">Décision saisie à la main, sans mesure associée.</p>
      )}
      <ol className="flex flex-wrap items-center gap-1" aria-label="Chaîne de traçabilité">
        {chaine.map((maillon, index) => (
          <li key={maillon.noeudId} className="flex items-center gap-1">
            {index > 0 && <span className="text-neutral-400">→</span>}
            <span
              className="rounded border border-neutral-200 bg-white px-1.5 py-0.5"
              title={`${maillon.noeudId} (${maillon.type})`}
            >
              {maillon.libelle}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
