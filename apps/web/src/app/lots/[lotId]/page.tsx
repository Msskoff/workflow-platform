import { apiRoutes, lotSchema } from '@workflow/shared';
import Link from 'next/link';
import { SuiviLot } from '@/components/lots/suivi-lot';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

interface LotPageProps {
  params: Promise<{ lotId: string }>;
}

export default async function LotPage({ params }: LotPageProps) {
  const { lotId } = await params;
  const lot = await lireApiServeur({
    chemin: `${apiRoutes.lots}/${encodeURIComponent(lotId)}`,
    schema: lotSchema,
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/lots" className="text-sm text-neutral-600 underline">
            ← Tous les lots
          </Link>
          <h1 className="text-xl font-semibold">{lot.ok ? lot.donnees.nom : 'Lot'}</h1>
        </div>
        <LiensNavigation actif="/lots" />
      </header>
      {lot.ok ? (
        <SuiviLot lotInitial={lot.donnees} />
      ) : (
        <p className="text-sm text-red-700">
          {lot.statut === 404 ? 'Lot introuvable.' : lot.erreur}
        </p>
      )}
    </main>
  );
}
