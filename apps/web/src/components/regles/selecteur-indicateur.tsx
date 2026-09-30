'use client';

import { libelleIndicateur } from '@workflow/shared';
import type { IndicateurDisponible } from '@/components/parametres/contexte-parametres';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface SelecteurIndicateurProps {
  valeur: string;
  /** Indicateurs publiés par les nœuds connectés en amont. */
  indicateurs: readonly IndicateurDisponible[];
  surChangement: (params: { indicateur: string }) => void;
}

/**
 * Choix de l'indicateur d'une règle parmi ceux fournis en entrée. Sans entrée connectée,
 * la clé se saisit librement ; une clé absente des entrées reste visible et signalée.
 */
export function SelecteurIndicateur({
  valeur,
  indicateurs,
  surChangement,
}: SelecteurIndicateurProps) {
  if (indicateurs.length === 0) {
    return (
      <input
        type="text"
        className={CLASSES_CHAMP}
        placeholder="Clé de l’indicateur (ex. ndviMoyen)"
        value={valeur}
        onChange={(evenement) => surChangement({ indicateur: evenement.target.value.trim() })}
      />
    );
  }
  const connu = indicateurs.some((indicateur) => indicateur.cle === valeur);
  return (
    <select
      className={CLASSES_CHAMP}
      value={valeur}
      onChange={(evenement) => surChangement({ indicateur: evenement.target.value })}
    >
      <option value="">— Choisir un indicateur —</option>
      {indicateurs.map((indicateur) => (
        <option key={indicateur.cle} value={indicateur.cle}>
          {indicateur.libelle}
          {indicateur.unite ? ` (${indicateur.unite})` : ''}
        </option>
      ))}
      {!connu && valeur !== '' && (
        <option value={valeur}>{libelleIndicateur({ cle: valeur })} : non fourni en entrée</option>
      )}
    </select>
  );
}
