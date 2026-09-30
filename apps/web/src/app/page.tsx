import Link from 'next/link';
import { ApiStatusCard } from '@/components/api-status-card';
import { fetchApiHealth } from '@/lib/fetch-api-health';

// Statut lu à chaque requête, jamais figé au build.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const result = await fetchApiHealth({ apiUrl });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Workflow Platform</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Outil interne de construction des pipelines de traitement de parcelle.
        </p>
      </header>
      <ApiStatusCard apiUrl={apiUrl} result={result} />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/editeur"
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Ouvrir l&apos;éditeur de workflow
        </Link>
        <Link
          href="/revue"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
        >
          Revue des décisions
        </Link>
        <Link
          href="/clients"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
        >
          Clients
        </Link>
      </div>
    </main>
  );
}
