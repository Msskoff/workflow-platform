'use client';

import type { Client } from '@workflow/shared';
import { useState, type FormEvent } from 'react';
import { creerClient, ErreurApi } from '@/lib/api/api-navigateur';

interface FormulaireClientProps {
  surCreation: (params: { client: Client }) => void;
}

/** Nouveau client : nom et courriel (facultatif). */
export function FormulaireClient({ surCreation }: FormulaireClientProps) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setEnvoi(true);
    try {
      const client = await creerClient({
        donnees: { nom: nom.trim(), ...(email.trim() ? { email: email.trim() } : {}) },
      });
      surCreation({ client });
      setNom('');
      setEmail('');
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
        Nom du client
        <input
          required
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
          placeholder="EARL du Moulin"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Courriel (facultatif)
        <input
          type="email"
          value={email}
          onChange={(evenement) => setEmail(evenement.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={envoi}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-neutral-400"
      >
        Créer le client
      </button>
      {erreur && <p className="w-full text-sm text-red-700">{erreur}</p>}
    </form>
  );
}
