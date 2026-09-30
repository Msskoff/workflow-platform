import { apiRoutes, suiviCampagneSchema } from '@workflow/shared';
import Link from 'next/link';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { EcranSuiviCampagne } from '@/components/suivi/ecran-suivi-campagne';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

interface SuiviCampagnePageProps {
  params: Promise<{ campagneId: string }>;
}

export default async function SuiviCampagnePage({ params }: SuiviCampagnePageProps) {
  const { campagneId } = await params;
  const suivi = await lireApiServeur({
    chemin: `${apiRoutes.suiviCampagnes}/${encodeURIComponent(campagneId)}`,
    schema: suiviCampagneSchema,
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/suivi" className="text-sm text-neutral-600 underline">
            ← Toutes les campagnes
          </Link>
          {suivi.ok && (
            <>
              <p className="text-xs text-neutral-500">{suivi.donnees.client.nom}</p>
              <h1 className="text-xl font-semibold">
                {suivi.donnees.parcelle.nom} · {suivi.donnees.campagne.nom}
                {suivi.donnees.campagne.culture ? ` (${suivi.donnees.campagne.culture})` : ''}
              </h1>
            </>
          )}
        </div>
        <LiensNavigation actif="/suivi" />
      </header>
      {suivi.ok ? (
        <EcranSuiviCampagne decisionsInitiales={suivi.donnees.decisions} />
      ) : (
        <p className="text-sm text-red-700">
          {suivi.statut === 404 ? 'Campagne introuvable.' : suivi.erreur}
        </p>
      )}
    </main>
  );
}
