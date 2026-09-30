import { apiRoutes, vueEspaceClientSchema } from '@workflow/shared';
import { AccesRefuse } from '@/components/espace-client/acces-refuse';
import { CarteResumeParcelle } from '@/components/espace-client/carte-resume-parcelle';
import { EnTeteEspace } from '@/components/espace-client/en-tete-espace';
import { lireApiServeur } from '@/lib/api/api-serveur';

// Les décisions envoyées apparaissent dès l'envoi.
export const dynamic = 'force-dynamic';

interface EspaceClientPageProps {
  params: Promise<{ jeton: string }>;
}

export default async function EspaceClientPage({ params }: EspaceClientPageProps) {
  const { jeton } = await params;
  const vue = await lireApiServeur({
    chemin: `${apiRoutes.espaceClient}/${encodeURIComponent(jeton)}`,
    schema: vueEspaceClientSchema,
  });
  if (!vue.ok) {
    return <AccesRefuse lienInvalide={vue.statut === 404} />;
  }
  const { client, parcelles } = vue.donnees;

  return (
    <>
      <EnTeteEspace nomClient={client.nom} titre="Vos parcelles" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {parcelles.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-neutral-600">
            Aucune parcelle pour le moment : votre conseiller les ajoutera après la première visite.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {parcelles.map((parcelle) => (
              <CarteResumeParcelle
                key={parcelle.id}
                parcelle={parcelle}
                href={`/espace/${encodeURIComponent(jeton)}/parcelles/${parcelle.id}`}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
