'use client';

import { useState } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface FormulaireEnregistrerModeleProps {
  nomPropose: string;
  enCours: boolean;
  erreurs: readonly string[];
  surEnregistrement: (params: { nom: string; description: string }) => void;
  surAnnulation: () => void;
}

/** Enregistre le graphe courant comme modèle réutilisable (sans les fichiers chargés). */
export function FormulaireEnregistrerModele({
  nomPropose,
  enCours,
  erreurs,
  surEnregistrement,
  surAnnulation,
}: FormulaireEnregistrerModeleProps) {
  const [nom, setNom] = useState(nomPropose);
  const [description, setDescription] = useState('');

  return (
    <form
      className="space-y-2 rounded border border-neutral-200 bg-neutral-50 p-3"
      onSubmit={(evenement) => {
        evenement.preventDefault();
        surEnregistrement({ nom: nom.trim(), description: description.trim() });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
        <label className="space-y-1 text-xs">
          <span className="font-medium">Nom du modèle</span>
          <input
            className={CLASSES_CHAMP}
            value={nom}
            maxLength={200}
            required
            onChange={(evenement) => setNom(evenement.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium">Description</span>
          <input
            className={CLASSES_CHAMP}
            value={description}
            maxLength={1000}
            onChange={(evenement) => setDescription(evenement.target.value)}
          />
        </label>
      </div>
      <p className="text-[11px] text-neutral-500">
        Nœuds, réglages et connexions sont enregistrés ; les fichiers chargés (GPS, image, photos)
        ne le sont pas.
      </p>
      {erreurs.length > 0 && (
        <ul className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          {erreurs.map((erreur) => (
            <li key={erreur}>{erreur}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enCours || nom.trim() === ''}
          className="rounded bg-neutral-900 px-3 py-1 text-xs font-semibold text-white disabled:bg-neutral-300"
        >
          Enregistrer le modèle
        </button>
        <button type="button" className="text-xs underline" onClick={surAnnulation}>
          Annuler
        </button>
      </div>
    </form>
  );
}
