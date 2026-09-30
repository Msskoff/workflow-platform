import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Le `.env` est unique, à la racine du monorepo (partagé avec l'API).
const rootEnvPath = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Le navigateur appelle l'API via `/api/*` : même origine, pas de CORS ni d'URL publique.
  rewrites: async () => [{ source: '/api/:chemin*', destination: `${apiUrl}/:chemin*` }],
};

export default nextConfig;
