import {
  apiRoutes,
  campagneSchema,
  clientSchema,
  libellesStatutsLot,
  parcelleSchema,
  resumeLotSchema,
  resumeModeleSchema,
} from '@workflow/shared';
import Link from 'next/link';
import { z } from 'zod';
import { BarreProgression } from '@/components/lots/barre-progression';
import { FormulaireLot } from '@/components/lots/formulaire-lot';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

export default async function LotsPage() {
  const [lots, modeles, clients, parcelles, campagnes] = await Promise.all([
    lireApiServeur({ chemin: apiRoutes.lots, schema: z.array(resumeLotSchema) }),
    lireApiServeur({ chemin: apiRoutes.modeles, schema: z.array(resumeModeleSchema) }),
    lireApiServeur({ chemin: apiRoutes.clients, schema: z.array(clientSchema) }),
    lireApiServeur({ chemin: apiRoutes.parcelles, schema: z.array(parcelleSchema) }),
    lireApiServeur({ chemin: apiRoutes.campagnes, schema: z.array(campagneSchema) }),
  ]);
  const erreur = [lots, modeles, clients, parcelles, campagnes].find((resultat) => !resultat.ok);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Exécutions par lot</h1>
          <p className="text-sm text-neutral-600">
            Un même modèle lancé sur plusieurs parcelles, traité en file d’attente : chaque parcelle
            réussit ou échoue indépendamment, avec relances automatiques.
          </p>
        </div>
        <LiensNavigation actif="/lots" />
      </header>
      {!lots.ok || !modeles.ok || !clients.ok || !parcelles.ok || !campagnes.ok ? (
        <p className="text-sm text-red-700">{erreur && !erreur.ok ? erreur.erreur : ''}</p>
      ) : (
        <>
          <FormulaireLot
            modeles={modeles.donnees}
            clients={clients.donnees}
            parcelles={parcelles.donnees}
            campagnes={campagnes.donnees}
          />
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Lots récents</h2>
            {lots.donnees.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun lot lancé pour le moment.</p>
            ) : (
              lots.donnees.map((lot) => (
                <Link
                  key={lot.id}
                  href={`/lots/${lot.id}`}
                  className="block space-y-1 rounded-lg border border-neutral-200 bg-white p-3 hover:border-emerald-600"
                >
                  <p className="text-sm font-medium">
                    {lot.nom}{' '}
                    <span className="text-xs font-normal text-neutral-500">
                      · {libellesStatutsLot[lot.statut]}
                    </span>
                  </p>
                  <BarreProgression progression={lot.progression} />
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
