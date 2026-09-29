import type { ApiHealthResult } from '@/lib/fetch-api-health';

interface ApiStatusCardProps {
  apiUrl: string;
  result: ApiHealthResult;
}

export function ApiStatusCard({ apiUrl, result }: ApiStatusCardProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${result.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          aria-hidden
        />
        <h2 className="font-medium">API {result.ok ? 'joignable' : 'injoignable'}</h2>
      </div>
      <p className="mt-1 font-mono text-xs text-neutral-500">{apiUrl}</p>
      {result.ok ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-neutral-500">Service</dt>
          <dd>{result.health.service}</dd>
          <dt className="text-neutral-500">Statut</dt>
          <dd>{result.health.status}</dd>
          <dt className="text-neutral-500">Base de données</dt>
          <dd className={result.health.database === 'up' ? 'text-emerald-700' : 'text-red-700'}>
            {result.health.database}
          </dd>
          <dt className="text-neutral-500">Horodatage</dt>
          <dd className="font-mono">{result.health.timestamp}</dd>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-red-700">{result.error}</p>
      )}
    </section>
  );
}
