'use client';

import { libellesOperateurs, operateursRegle, type OperateurRegle } from '@workflow/shared';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface SelecteurOperateurProps {
  valeur: OperateurRegle;
  surChangement: (params: { operateur: OperateurRegle }) => void;
}

/** Choix de l'opérateur de comparaison d'une règle. */
export function SelecteurOperateur({ valeur, surChangement }: SelecteurOperateurProps) {
  return (
    <select
      className={CLASSES_CHAMP}
      value={valeur}
      aria-label="Opérateur"
      onChange={(evenement) => {
        const choisi = operateursRegle.find((operateur) => operateur === evenement.target.value);
        if (choisi) {
          surChangement({ operateur: choisi });
        }
      }}
    >
      {operateursRegle.map((operateur) => (
        <option key={operateur} value={operateur}>
          {operateur} ({libellesOperateurs[operateur]})
        </option>
      ))}
    </select>
  );
}
