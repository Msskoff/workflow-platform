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
          Squelette du monorepo : liaison front → API → types partagés.
        </p>
      </header>
      <ApiStatusCard apiUrl={apiUrl} result={result} />
    </main>
  );
}
