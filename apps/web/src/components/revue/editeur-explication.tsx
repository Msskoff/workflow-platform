'use client';

import { explicationSchema } from '@workflow/shared';
import { useState } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface EditeurExplicationProps {
  explication: string;
  /** Faux hors brouillon : l'explication est alors figée. */
  modifiable: boolean;
  enCours: boolean;
  surEnregistrement: (params: { explication: string }) => void;
}

/** Explication (le « pourquoi ») d'une décision, modifiable en une phrase tant qu'elle est en brouillon. */
export function EditeurExplication({
  explication,
  modifiable,
  enCours,
  surEnregistrement,
}: EditeurExplicationProps) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const validation = brouillon === null ? null : explicationSchema.safeParse(brouillon);
  const erreur = validation && !validation.success ? validation.error.issues[0]?.message : null;

  if (brouillon === null) {
    return (
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-neutral-800">
          <span className="font-semibold">Pourquoi : </span>
          {explication}
        </p>
        {modifiable && (
          <button
            type="button"
            className="shrink-0 text-xs text-neutral-600 underline"
            onClick={() => setBrouillon(explication)}
          >
            Modifier l’explication
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <textarea
        rows={2}
        className={`${CLASSES_CHAMP} resize-none`}
        value={brouillon}
        maxLength={300}
        aria-label="Explication"
        onChange={(evenement) => setBrouillon(evenement.target.value.replace(/[\r\n]+/g, ' '))}
        onKeyDown={(evenement) => {
          if (evenement.key === 'Enter') {
            evenement.preventDefault();
          }
        }}
      />
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={enCours || !!erreur || brouillon.trim() === explication}
          className="rounded bg-neutral-900 px-3 py-1 text-xs font-semibold text-white disabled:bg-neutral-300"
          onClick={() => {
            surEnregistrement({ explication: brouillon.trim() });
            setBrouillon(null);
          }}
        >
          Enregistrer
        </button>
        <button type="button" className="text-xs underline" onClick={() => setBrouillon(null)}>
          Annuler
        </button>
      </div>
    </div>
  );
}
