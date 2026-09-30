import { formaterNombre, libelleIndicateur } from '@workflow/shared';
import type { RegleEditee } from '@/lib/regles/regle-editee';

interface PhraseRegleProps {
  regle: RegleEditee;
}

/** Résumé lisible d'une règle : « Si NDVI moyen < 0,5 → recommandation ». */
export function PhraseRegle({ regle }: PhraseRegleProps) {
  return (
    <span className="text-xs text-neutral-700">
      Si <strong>{regle.indicateur ? libelleIndicateur({ cle: regle.indicateur }) : '…'}</strong>{' '}
      <span className="font-mono">{regle.operateur}</span>{' '}
      <strong>{regle.seuil === undefined ? '…' : formaterNombre({ nombre: regle.seuil })}</strong>
      {regle.recommandation && <span className="text-neutral-500"> → {regle.recommandation}</span>}
    </span>
  );
}
