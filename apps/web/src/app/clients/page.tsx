import { apiRoutes, campagneSchema, clientSchema, parcelleSchema } from '@workflow/shared';
import { z } from 'zod';
import { EcranClients } from '@/components/clients/ecran-clients';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const [clients, parcelles, campagnes] = await Promise.all([
    lireApiServeur({ chemin: apiRoutes.clients, schema: z.array(clientSchema) }),
    lireApiServeur({ chemin: apiRoutes.parcelles, schema: z.array(parcelleSchema) }),
    lireApiServeur({ chemin: apiRoutes.campagnes, schema: z.array(campagneSchema) }),
  ]);
  const erreur = [clients, parcelles, campagnes].find((resultat) => !resultat.ok);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-neutral-600">
            Créez le client, sa parcelle (contour GPS) et la campagne, puis transmettez-lui le lien
            de son espace. Il n’y verra que les décisions envoyées.
          </p>
        </div>
        <LiensNavigation actif="/clients" />
      </header>
      {clients.ok && parcelles.ok && campagnes.ok ? (
        <EcranClients
          clientsInitiaux={clients.donnees}
          parcellesInitiales={parcelles.donnees}
          campagnesInitiales={campagnes.donnees}
        />
      ) : (
        <p className="text-sm text-red-700">{erreur && !erreur.ok ? erreur.erreur : ''}</p>
      )}
    </main>
  );
}
