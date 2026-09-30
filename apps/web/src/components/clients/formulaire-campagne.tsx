'use client';

import type { Campagne } from '@workflow/shared';
import { useState, type FormEvent } from 'react';
import { creerCampagne, ErreurApi } from '@/lib/api/api-navigateur';

interface FormulaireCampagneProps {
  parcelleId: string;
  surCreation: (params: { campagne: Campagne }) => void;
}

/** Aujourd'hui au format AAAA-MM-JJ (heure locale). */
function aujourdHui(): string {
  const date = new Date();
  const deuxChiffres = (valeur: number) => String(valeur).padStart(2, '0');
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** Nouvelle campagne (saison) sur une parcelle. */
export function FormulaireCampagne({ parcelleId, surCreation }: FormulaireCampagneProps) {
  const [nom, setNom] = useState(`Saison ${new Date().getFullYear()}`);
  const [culture, setCulture] = useState('');
  const [dateDebut, setDateDebut] = useState(aujourdHui);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setEnvoi(true);
    try {
      const campagne = await creerCampagne({
        donnees: {
          parcelleId,
          nom: nom.trim(),
          dateDebut,
          ...(culture.trim() ? { culture: culture.trim() } : {}),
        },
      });
      surCreation({ campagne });
      setCulture('');
      setErreur(null);
    } catch (probleme) {
      setErreur(probleme instanceof ErreurApi ? probleme.details.join(' · ') : String(probleme));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form
      onSubmit={(evenement) => void valider(evenement)}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Campagne
        <input
          required
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Culture
        <input
          value={culture}
          onChange={(evenement) => setCulture(evenement.target.value)}
          className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm"
          placeholder="Blé tendre"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Début
        <input
          type="date"
          required
          value={dateDebut}
          onChange={(evenement) => setDateDebut(evenement.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={envoi}
        className="rounded border border-neutral-400 bg-white px-3 py-1 text-sm hover:bg-neutral-100"
      >
        Ajouter la campagne
      </button>
      {erreur && <p className="w-full text-sm text-red-700">{erreur}</p>}
    </form>
  );
}
