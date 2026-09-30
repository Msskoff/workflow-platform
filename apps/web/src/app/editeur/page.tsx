import { apiRoutes, campagneSchema, descripteurNoeudSchema } from '@workflow/shared';
import Link from 'next/link';
import { z } from 'zod';
import { EditeurWorkflow } from '@/components/editeur/editeur-workflow';
import { lireApiServeur } from '@/lib/api/api-serveur';

// Catalogue et campagnes lus à chaque requête.
export const dynamic = 'force-dynamic';

export default async function EditeurPage() {
  const [catalogue, campagnes] = await Promise.all([
    lireApiServeur({ chemin: apiRoutes.noeuds, schema: z.array(descripteurNoeudSchema) }),
    lireApiServeur({ chemin: apiRoutes.campagnes, schema: z.array(campagneSchema) }),
  ]);

  if (!catalogue.ok || !campagnes.ok) {
    return (
      <main className="mx-auto max-w-xl space-y-3 p-8">
        <h1 className="text-xl font-semibold">Éditeur indisponible</h1>
        <p className="text-sm text-red-700">
          {!catalogue.ok ? catalogue.erreur : !campagnes.ok ? campagnes.erreur : ''}
        </p>
        <Link href="/" className="text-sm underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  return (
    <EditeurWorkflow descripteurs={catalogue.donnees} campagnesInitiales={campagnes.donnees} />
  );
}
