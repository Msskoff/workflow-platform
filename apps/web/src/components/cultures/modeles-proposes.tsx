import type { ResumeModele } from '@workflow/shared';
import Link from 'next/link';

interface ModelesProposesProps {
  modeles: readonly ResumeModele[];
  /** Campagne à présélectionner dans l'éditeur (absente avant la création de la campagne). */
  campagneId?: string;
}

/** Modèles de workflow adaptés à la culture, à ouvrir dans l'éditeur. */
export function ModelesProposes({ modeles, campagneId }: ModelesProposesProps) {
  if (modeles.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        Aucun modèle rattaché à cette culture : utilisez un modèle générique dans l’éditeur.
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-xs">
      {modeles.map((modele) => {
        const requete = new URLSearchParams({
          modele: modele.id,
          ...(campagneId && { campagne: campagneId }),
        });
        return (
          <li key={modele.id} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{modele.nom}</span>
            <span className="text-neutral-500">{modele.nombreNoeuds} nœuds</span>
            {campagneId && (
              <Link href={`/editeur?${requete.toString()}`} className="text-emerald-800 underline">
                Ouvrir dans l’éditeur
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
