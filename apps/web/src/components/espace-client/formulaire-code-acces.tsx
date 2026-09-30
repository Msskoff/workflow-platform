'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/** Le client peut coller son lien complet ou seulement le code qu'il contient. */
function extraireCode({ saisie }: { saisie: string }): string {
  const texte = saisie.trim();
  const dansLien = /\/espace\/([A-Za-z0-9_-]+)/.exec(texte);
  return dansLien?.[1] ?? texte;
}

/** Saisie du code d'accès reçu du conseiller. */
export function FormulaireCodeAcces() {
  const router = useRouter();
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    const code = extraireCode({ saisie });
    if (!/^[A-Za-z0-9_-]{32,}$/.test(code)) {
      setErreur('Ce code ne semble pas complet : copiez-le en entier depuis le message reçu.');
      return;
    }
    router.push(`/espace/${code}`);
  };

  return (
    <form onSubmit={valider} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-neutral-800">Votre code ou votre lien</span>
        <input
          value={saisie}
          onChange={(evenement) => {
            setSaisie(evenement.target.value);
            setErreur(null);
          }}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
          placeholder="Collez ici le code reçu"
        />
      </label>
      {erreur && (
        <p className="text-sm text-red-700" role="alert">
          {erreur}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
      >
        Accéder à mes parcelles
      </button>
    </form>
  );
}
