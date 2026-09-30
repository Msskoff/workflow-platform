import {
  apiRoutes,
  campagneSchema,
  clientSchema,
  descripteurNoeudSchema,
  parcelleSchema,
  resumeModeleSchema,
} from '@workflow/shared';
import Link from 'next/link';
import { z } from 'zod';
import { EditeurWorkflow } from '@/components/editeur/editeur-workflow';
import { lireApiServeur } from '@/lib/api/api-serveur';

// Catalogue, campagnes et modèles lus à chaque requête.
export const dynamic = 'force-dynamic';

export default async function EditeurPage() {
  const [catalogue, campagnes, modeles, clients, parcelles] = await Promise.all([
    lireApiServeur({ chemin: apiRoutes.noeuds, schema: z.array(descripteurNoeudSchema) }),
    lireApiServeur({ chemin: apiRoutes.campagnes, schema: z.array(campagneSchema) }),
    lireApiServeur({ chemin: apiRoutes.modeles, schema: z.array(resumeModeleSchema) }),
    lireApiServeur({ chemin: apiRoutes.clients, schema: z.array(clientSchema) }),
    lireApiServeur({ chemin: apiRoutes.parcelles, schema: z.array(parcelleSchema) }),
  ]);

  if (!catalogue.ok || !campagnes.ok || !modeles.ok || !clients.ok || !parcelles.ok) {
    const erreur = [catalogue, campagnes, modeles, clients, parcelles].find(
      (resultat) => !resultat.ok,
    );
    return (
      <main className="mx-auto max-w-xl space-y-3 p-8">
        <h1 className="text-xl font-semibold">Éditeur indisponible</h1>
        <p className="text-sm text-red-700">{erreur && !erreur.ok ? erreur.erreur : ''}</p>
        <Link href="/" className="text-sm underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  // « Client · Parcelle · Campagne » : on sait pour qui on exécute le workflow.
  const nomsClients = new Map(clients.donnees.map((client) => [client.id, client.nom]));
  const parcellesParId = new Map(parcelles.donnees.map((parcelle) => [parcelle.id, parcelle]));
  const libellesCampagnes = Object.fromEntries(
    campagnes.donnees.map((campagne) => {
      const parcelle = parcellesParId.get(campagne.parcelleId);
      const client = parcelle ? nomsClients.get(parcelle.clientId) : undefined;
      return [
        campagne.id,
        [client, parcelle?.nom, campagne.nom].filter((partie) => partie !== undefined).join(' · '),
      ];
    }),
  );

  return (
    <EditeurWorkflow
      descripteurs={catalogue.donnees}
      campagnesInitiales={campagnes.donnees}
      libellesCampagnes={libellesCampagnes}
      modelesInitiaux={modeles.donnees}
    />
  );
}
