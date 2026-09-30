'use client';

import type { Campagne, Client, Culture, Parcelle } from '@workflow/shared';
import { useState } from 'react';
import { FicheClient } from './fiche-client';
import { FormulaireClient } from './formulaire-client';

interface EcranClientsProps {
  clientsInitiaux: Client[];
  parcellesInitiales: Parcelle[];
  campagnesInitiales: Campagne[];
  cultures: Culture[];
}

/** Gestion interne des clients : création, parcelles, campagnes, accès à l'espace client. */
export function EcranClients({
  clientsInitiaux,
  parcellesInitiales,
  campagnesInitiales,
  cultures,
}: EcranClientsProps) {
  const [clients, setClients] = useState(clientsInitiaux);
  const [parcelles, setParcelles] = useState(parcellesInitiales);
  const [campagnes, setCampagnes] = useState(campagnesInitiales);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <FormulaireClient
          surCreation={({ client }) => setClients((existants) => [client, ...existants])}
        />
      </section>
      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun client pour le moment.</p>
      ) : (
        clients.map((client) => (
          <FicheClient
            key={client.id}
            client={client}
            parcelles={parcelles.filter((parcelle) => parcelle.clientId === client.id)}
            campagnes={campagnes}
            cultures={cultures}
            surParcelleCreee={({ parcelle }) =>
              setParcelles((existantes) => [...existantes, parcelle])
            }
            surCampagneCreee={({ campagne }) =>
              setCampagnes((existantes) => [...existantes, campagne])
            }
          />
        ))
      )}
    </div>
  );
}
