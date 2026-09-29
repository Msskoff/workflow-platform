import { existsSync } from 'node:fs';

interface LoadRootEnvParams {
  /** Chemin absolu du fichier `.env` à charger. */
  envFilePath: string;
}

/**
 * Charge le `.env` racine du monorepo s'il existe.
 * Les variables déjà présentes dans l'environnement ne sont pas écrasées.
 */
export function loadRootEnv({ envFilePath }: LoadRootEnvParams): void {
  if (existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
}
