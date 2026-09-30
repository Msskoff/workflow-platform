'use client';

import { interpolerExplication, libelleIndicateur, variablesExplication } from '@workflow/shared';
import { useRef } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface ChampModeleExplicationProps {
  valeur: string;
  indicateur: string;
  seuil: number | undefined;
  surChangement: (params: { explication: string }) => void;
}

/**
 * Explication d'une règle : une phrase, avec insertion de `{valeur}`, `{seuil}`,
 * `{indicateur}` et aperçu du texte tel que le lira le fermier.
 */
export function ChampModeleExplication({
  valeur,
  indicateur,
  seuil,
  surChangement,
}: ChampModeleExplicationProps) {
  const champ = useRef<HTMLTextAreaElement>(null);

  const inserer = ({ variable }: { variable: string }) => {
    const element = champ.current;
    const debut = element?.selectionStart ?? valeur.length;
    const fin = element?.selectionEnd ?? valeur.length;
    surChangement({ explication: `${valeur.slice(0, debut)}{${variable}}${valeur.slice(fin)}` });
    requestAnimationFrame(() => element?.focus());
  };

  const apercu =
    valeur.trim() === ''
      ? null
      : interpolerExplication({
          modele: valeur,
          valeur: seuil ?? 0,
          seuil: seuil ?? 0,
          indicateur: indicateur
            ? libelleIndicateur({ cle: indicateur }).toLowerCase()
            : 'l’indicateur',
        });

  return (
    <div className="space-y-1">
      <textarea
        ref={champ}
        rows={2}
        className={`${CLASSES_CHAMP} resize-none`}
        value={valeur}
        maxLength={250}
        placeholder="Une phrase qui explique la décision au fermier."
        onChange={(evenement) =>
          surChangement({ explication: evenement.target.value.replace(/[\r\n]+/g, ' ') })
        }
        onKeyDown={(evenement) => {
          if (evenement.key === 'Enter') {
            evenement.preventDefault();
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <span className="text-neutral-500">Insérer :</span>
        {variablesExplication.map((variable) => (
          <button
            key={variable}
            type="button"
            className="rounded bg-neutral-100 px-1.5 font-mono hover:bg-neutral-200"
            onClick={() => inserer({ variable })}
          >
            {`{${variable}}`}
          </button>
        ))}
      </div>
      {apercu && (
        <p className="rounded bg-neutral-50 px-2 py-1 text-[11px] italic text-neutral-600">
          Aperçu (valeur = seuil) : {apercu}
        </p>
      )}
    </div>
  );
}
