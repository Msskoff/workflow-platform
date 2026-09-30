import {
  accesClientSchema,
  apiRoutes,
  campagneSchema,
  clientSchema,
  decisionClientSchema,
  decisionEnRevueSchema,
  decisionSchema,
  executionWorkflowSchema,
  modeleWorkflowSchema,
  parcelleSchema,
  resumeModeleSchema,
  SOUS_CHEMIN_LANCER_EXECUTION,
  type AccesClient,
  type Campagne,
  type Client,
  type CreerModele,
  type Decision,
  type DecisionClient,
  type DecisionEnRevue,
  type ExecutionWorkflow,
  type GeometrieParcelle,
  type ModeleWorkflow,
  type ModifierDecision,
  type Parcelle,
  type ResumeModele,
  type StatutDecision,
  type WorkflowSnapshot,
} from '@workflow/shared';
import { z } from 'zod';

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
  methode: 'GET' | 'POST' | 'PATCH';
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

/** Décisions avec leur contexte, pour l'écran de revue (toutes, ou d'un statut). */
export function listerDecisionsEnRevue({
  statut,
}: {
  statut?: StatutDecision;
}): Promise<DecisionEnRevue[]> {
  const requete = statut ? `?statut=${encodeURIComponent(statut)}` : '';
  return appeler({
    methode: 'GET',
    chemin: `${apiRoutes.revueDecisions}${requete}`,
    schema: z.array(decisionEnRevueSchema),
  });
}

/** Valider, rejeter, envoyer, modifier l'explication, le prévu ou le réel d'une décision. */
export function modifierDecision({
  id,
  donnees,
}: {
  id: string;
  donnees: ModifierDecision;
}): Promise<Decision> {
  return appeler({
    methode: 'PATCH',
    chemin: `${apiRoutes.decisions}/${id}`,
    corps: donnees,
    schema: decisionSchema,
  });
}

export function listerModeles(): Promise<ResumeModele[]> {
  return appeler({
    methode: 'GET',
    chemin: apiRoutes.modeles,
    schema: z.array(resumeModeleSchema),
  });
}

export function lireModele({ id }: { id: string }): Promise<ModeleWorkflow> {
  return appeler({
    methode: 'GET',
    chemin: `${apiRoutes.modeles}/${id}`,
    schema: modeleWorkflowSchema,
  });
}

export function creerModele({ donnees }: { donnees: CreerModele }): Promise<ModeleWorkflow> {
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.modeles,
    corps: donnees,
    schema: modeleWorkflowSchema,
  });
}

export function creerClient({
  donnees,
}: {
  donnees: { nom: string; email?: string };
}): Promise<Client> {
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.clients,
    corps: donnees,
    schema: clientSchema,
  });
}

export function creerParcelle({
  donnees,
}: {
  donnees: { clientId: string; nom: string; geometrie: GeometrieParcelle };
}): Promise<Parcelle> {
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.parcelles,
    corps: donnees,
    schema: parcelleSchema,
  });
}

export function creerCampagne({
  donnees,
}: {
  donnees: { parcelleId: string; nom: string; culture?: string; dateDebut: string };
}): Promise<Campagne> {
  return appeler({
    methode: 'POST',
    chemin: apiRoutes.campagnes,
    corps: donnees,
    schema: campagneSchema,
  });
}

/** Nouveau lien d'accès à l'espace client ; le précédent cesse de fonctionner. */
export function genererAccesClient({ clientId }: { clientId: string }): Promise<AccesClient> {
  return appeler({
    methode: 'POST',
    chemin: `${apiRoutes.clients}/${clientId}/acces`,
    schema: accesClientSchema,
  });
}

/** Case « fait » d'une recommandation, cochée depuis l'espace client (fermier ou agent). */
export function marquerFait({
  jeton,
  decisionId,
  fait,
}: {
  jeton: string;
  decisionId: string;
  fait: boolean;
}): Promise<DecisionClient> {
  return appeler({
    methode: 'POST',
    chemin: `${apiRoutes.espaceClient}/${encodeURIComponent(jeton)}/decisions/${encodeURIComponent(decisionId)}/fait`,
    corps: { fait },
    schema: decisionClientSchema,
  });
}
