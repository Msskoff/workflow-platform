'use client';

import type { Campagne, Client, Parcelle } from '@workflow/shared';
import { AccesEspaceClient } from './acces-espace-client';
import { FormulaireCampagne } from './formulaire-campagne';
import { FormulaireParcelle } from './formulaire-parcelle';

interface FicheClientProps {
  client: Client;
  parcelles: readonly Parcelle[];
  campagnes: readonly Campagne[];
  surParcelleCreee: (params: { parcelle: Parcelle }) => void;
  surCampagneCreee: (params: { campagne: Campagne }) => void;
}

/** Un client : ses parcelles, leurs campagnes, l'accès à son espace. */
export function FicheClient({
  client,
  parcelles,
  campagnes,
  surParcelleCreee,
  surCampagneCreee,
}: FicheClientProps) {
  return (
    <article
      className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      data-client={client.id}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{client.nom}</h2>
          {client.email && <p className="text-xs text-neutral-500">{client.email}</p>}
        </div>
        <AccesEspaceClient clientId={client.id} accesActif={client.accesActif} />
      </header>

      {parcelles.length > 0 && (
        <ul className="space-y-2">
          {parcelles.map((parcelle) => {
            const campagnesParcelle = campagnes.filter(
              (campagne) => campagne.parcelleId === parcelle.id,
            );
            return (
              <li key={parcelle.id} className="space-y-2 rounded border border-neutral-200 p-3">
                <p className="text-sm">
                  <span className="font-medium">{parcelle.nom}</span>{' '}
                  <span className="text-neutral-500">
                    · {parcelle.surfaceHa.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha
                  </span>
                </p>
                {campagnesParcelle.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {campagnesParcelle.map((campagne) => (
                      <li key={campagne.id} className="rounded-full bg-neutral-100 px-2 py-0.5">
                        {campagne.nom}
                        {campagne.culture ? ` · ${campagne.culture}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                <FormulaireCampagne parcelleId={parcelle.id} surCreation={surCampagneCreee} />
              </li>
            );
          })}
        </ul>
      )}
      <FormulaireParcelle clientId={client.id} surCreation={surParcelleCreee} />
    </article>
  );
}
