'use client';

import type { AccesClient } from '@workflow/shared';
import { useState } from 'react';
import { ErreurApi, genererAccesClient } from '@/lib/api/api-navigateur';

interface AccesEspaceClientProps {
  clientId: string;
  /** Un lien a déjà été généré (il n'est plus affichable : seule son empreinte est stockée). */
  accesActif: boolean;
}

/** Génère le lien d'accès à l'espace client ; le lien n'est affiché qu'une fois. */
export function AccesEspaceClient({ clientId, accesActif }: AccesEspaceClientProps) {
  const [acces, setAcces] = useState<AccesClient | null>(null);
  const [actif, setActif] = useState(accesActif);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const generer = async () => {
    if (actif && !window.confirm('Le lien actuel cessera de fonctionner. Continuer ?')) {
      return;
    }
    try {
      setAcces(await genererAccesClient({ clientId }));
      setActif(true);
      setCopie(false);
      setErreur(null);
    } catch (probleme) {
      setErreur(probleme instanceof ErreurApi ? probleme.details.join(' · ') : String(probleme));
    }
  };

  const lien = acces ? `${window.location.origin}/espace/${acces.jeton}` : null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={actif ? 'text-emerald-700' : 'text-neutral-500'}>
          {actif ? 'Espace client ouvert' : 'Pas encore d’accès client'}
        </span>
        <button
          type="button"
          onClick={() => void generer()}
          className="rounded border border-emerald-700 px-3 py-1 text-emerald-800 hover:bg-emerald-50"
        >
          {actif ? 'Régénérer le lien d’accès' : 'Générer le lien d’accès'}
        </button>
      </div>
      {lien && acces && (
        <div className="space-y-1 rounded border border-emerald-200 bg-emerald-50 p-2">
          <p className="text-xs text-emerald-900">
            À transmettre au client maintenant : ce lien ne sera plus affiché ensuite.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={lien}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-xs underline"
              data-lien-espace-client
            >
              {lien}
            </a>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(lien).then(
                  () => setCopie(true),
                  () => setCopie(false),
                )
              }
              className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {copie ? 'Copié' : 'Copier'}
            </button>
          </div>
          <p className="text-xs text-emerald-900">
            Code seul (à saisir sur /espace) : <span className="font-mono">{acces.jeton}</span>
          </p>
        </div>
      )}
      {erreur && <p className="text-red-700">{erreur}</p>}
    </div>
  );
}
