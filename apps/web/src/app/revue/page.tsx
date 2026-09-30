import { apiRoutes, decisionEnRevueSchema } from '@workflow/shared';
import { z } from 'zod';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { EcranRevue } from '@/components/revue/ecran-revue';
import { lireApiServeur } from '@/lib/api/api-serveur';

// Toujours à jour : les décisions changent à chaque exécution et chaque revue.
export const dynamic = 'force-dynamic';

export default async function RevuePage() {
  const decisions = await lireApiServeur({
    chemin: apiRoutes.revueDecisions,
    schema: z.array(decisionEnRevueSchema),
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Revue des décisions</h1>
          <p className="text-sm text-neutral-600">
            Validez, rejetez ou corrigez les décisions avant de les envoyer. Le client ne voit que
            les décisions envoyées.
          </p>
        </div>
        <LiensNavigation actif="/revue" />
      </header>
      {decisions.ok ? (
        <EcranRevue decisionsInitiales={decisions.donnees} />
      ) : (
        <p className="text-sm text-red-700">{decisions.erreur}</p>
      )}
    </main>
  );
}
