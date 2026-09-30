import { apiRoutes, resumeSuiviCampagneSchema } from '@workflow/shared';
import Link from 'next/link';
import { z } from 'zod';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { IndicateursSuivi } from '@/components/suivi/indicateurs-suivi';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

export default async function SuiviPage() {
  const campagnes = await lireApiServeur({
    chemin: apiRoutes.suiviCampagnes,
    schema: z.array(resumeSuiviCampagneSchema),
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Suivi de campagne</h1>
          <p className="text-sm text-neutral-600">
            Par parcelle : ce qui a été conseillé, ce qui a été appliqué, et ce qui reste à faire.
          </p>
        </div>
        <LiensNavigation actif="/suivi" />
      </header>
      {!campagnes.ok ? (
        <p className="text-sm text-red-700">{campagnes.erreur}</p>
      ) : campagnes.donnees.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucune campagne pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {campagnes.donnees.map(({ client, parcelle, campagne, indicateurs }) => (
            <li key={campagne.id}>
              <Link
                href={`/suivi/${campagne.id}`}
                className="block space-y-1 rounded-lg border border-neutral-200 bg-white p-4 hover:border-emerald-600"
              >
                <p className="text-xs text-neutral-500">{client.nom}</p>
                <p className="font-semibold">
                  {parcelle.nom} · {campagne.nom}
                  {campagne.culture ? ` (${campagne.culture})` : ''}
                </p>
                <IndicateursSuivi indicateurs={indicateurs} compact />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
