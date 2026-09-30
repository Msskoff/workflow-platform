import {
  apiRoutes,
  campagneSchema,
  clientSchema,
  executionWorkflowSchema,
  parcelleSchema,
  SOUS_CHEMIN_LANCER_EXECUTION,
  type Campagne,
  type ExecutionWorkflow,
  type WorkflowSnapshot,
} from '@workflow/shared';
import type { z } from 'zod';

/** Préfixe réécrit par Next vers l'API (voir next.config.ts). */
const PREFIXE_API = '/api';

/** Erreur renvoyée par l'API, avec le détail de chaque problème. */
export class ErreurApi extends Error {
  readonly details: string[];

  constructor({ message, details }: { message: string; details: string[] }) {
    super(message);
    this.details = details;
  }
}

/** Extrait les messages d'un corps d'erreur Nest (`message`, `erreurs[]`). */
function detailsErreur({ corps }: { corps: unknown }): string[] {
  if (typeof corps !== 'object' || corps === null) {
    return [];
  }
  const { message, erreurs } = corps as { message?: unknown; erreurs?: unknown };
  if (Array.isArray(erreurs)) {
    return erreurs.map((erreur: { message?: string; champ?: string }) =>
      erreur.champ ? `${erreur.champ} : ${erreur.message}` : String(erreur.message),
    );
  }
  if (Array.isArray(message)) {
    return message.map(String);
  }
  return typeof message === 'string' ? [message] : [];
}

interface AppelerParams<Schema extends z.ZodType> {
  methode: 'GET' | 'POST';
  chemin: string;
  corps?: unknown;
  schema: Schema;
}

async function appeler<Schema extends z.ZodType>({
  methode,
  chemin,
  corps,
  schema,
}: AppelerParams<Schema>): Promise<z.output<Schema>> {
  const reponse = await fetch(`${PREFIXE_API}${chemin}`, {
    method: methode,
    headers: corps === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const contenu: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const details = detailsErreur({ corps: contenu });
    throw new ErreurApi({ message: details[0] ?? `HTTP ${reponse.status}`, details });
  }
  return schema.parse(contenu);
}

export function creerExecution({
  campagneId,
  snapshot,
}: {
  campagneId: string;
  snapshot: WorkflowSnapshot;
}): Promise<ExecutionWorkflow> {
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.executions,
    corps: { campagneId, snapshot },
    schema: executionWorkflowSchema,
  });
}

export function lancerExecution({ id }: { id: string }): Promise<ExecutionWorkflow> {
  return appeler({
    methode: 'POST',
    chemin: `${apiRoutes.executions}/${id}/${SOUS_CHEMIN_LANCER_EXECUTION}`,
    schema: executionWorkflowSchema,
  });
}

export function lireExecution({ id }: { id: string }): Promise<ExecutionWorkflow> {
  return appeler({
    methode: 'GET',
    chemin: `${apiRoutes.executions}/${id}`,
    schema: executionWorkflowSchema,
  });
}

/** Crée client, parcelle et campagne de démonstration, pour tester l'éditeur sur une base vide. */
export async function creerCampagneDemo(): Promise<Campagne> {
  const client = await appeler({
    methode: 'POST',
    chemin: apiRoutes.clients,
    corps: { nom: 'Client de démonstration' },
    schema: clientSchema,
  });
  const parcelle = await appeler({
    methode: 'POST',
    chemin: apiRoutes.parcelles,
    corps: {
      clientId: client.id,
      nom: 'Parcelle de démonstration',
      geometrie: {
        type: 'Polygon',
        coordinates: [
          [
            [1.48, 48.44],
            [1.49, 48.44],
            [1.49, 48.45],
            [1.48, 48.45],
            [1.48, 48.44],
          ],
        ],
      },
    },
    schema: parcelleSchema,
  });
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.campagnes,
    corps: {
      parcelleId: parcelle.id,
      nom: 'Campagne de démonstration',
      dateDebut: new Date().toISOString().slice(0, 10),
    },
    schema: campagneSchema,
  });
}
