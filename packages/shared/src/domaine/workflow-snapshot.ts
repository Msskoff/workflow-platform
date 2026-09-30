import { z } from 'zod';
import { identifiantSchema, texteCourtSchema } from './commun';
import { valeursVariablesSchema, variableWorkflowSchema } from './variables-workflow';

export const positionNoeudSchema = z.object({ x: z.number(), y: z.number() });

/** Instance d'un nœud dans un workflow. `type` référence l'`id` d'une NodeDefinition. */
export const noeudWorkflowSchema = z.object({
  id: identifiantSchema,
  type: texteCourtSchema,
  libelle: texteCourtSchema.optional(),
  parametres: z.record(z.string(), z.json()).default({}),
  /** Position dans l'éditeur, sans effet sur l'exécution. */
  position: positionNoeudSchema.optional(),
});

export type NoeudWorkflow = z.infer<typeof noeudWorkflowSchema>;

/** Connexion orientée d'une sortie (`source.sourcePort`) vers une entrée (`cible.ciblePort`). */
export const connexionWorkflowSchema = z.object({
  id: identifiantSchema,
  source: identifiantSchema,
  sourcePort: z.string().min(1),
  cible: identifiantSchema,
  ciblePort: z.string().min(1),
});

export type ConnexionWorkflow = z.infer<typeof connexionWorkflowSchema>;

interface GrapheBrut {
  noeuds: readonly { id: string }[];
  connexions: readonly { source: string; cible: string }[];
}

interface VerifierReferencesParams {
  graphe: GrapheBrut;
  contexte: z.RefinementCtx;
}

/** Cohérence structurelle : ids de nœuds uniques, connexions vers des nœuds existants. */
function verifierReferences({ graphe, contexte }: VerifierReferencesParams): void {
  const idsNoeuds = new Set<string>();
  graphe.noeuds.forEach((noeud, index) => {
    if (idsNoeuds.has(noeud.id)) {
      contexte.addIssue({
        code: 'custom',
        message: `Identifiant de nœud en double : ${noeud.id}`,
        path: ['noeuds', index, 'id'],
      });
    }
    idsNoeuds.add(noeud.id);
  });

  graphe.connexions.forEach((connexion, index) => {
    for (const extremite of ['source', 'cible'] as const) {
      if (!idsNoeuds.has(connexion[extremite])) {
        contexte.addIssue({
          code: 'custom',
          message: `La connexion référence un nœud inexistant : ${connexion[extremite]}`,
          path: ['connexions', index, extremite],
        });
      }
    }
  });
}

const champsGrapheWorkflow = {
  noeuds: z.array(noeudWorkflowSchema).min(1),
  connexions: z.array(connexionWorkflowSchema),
  /** Variables d'entrée, référencées dans les paramètres par `${nom}`. */
  variables: z.array(variableWorkflowSchema).max(30).default([]),
};

/**
 * Graphe d'un workflow : nœuds et connexions. La compatibilité des types et l'absence
 * de cycle sont vérifiées par `validerWorkflow`, qui a besoin du catalogue de nœuds.
 */
export const grapheWorkflowSchema = z
  .object(champsGrapheWorkflow)
  .superRefine((graphe, contexte) => verifierReferences({ graphe, contexte }));

export type GrapheWorkflow = z.infer<typeof grapheWorkflowSchema>;

/** Copie figée du workflow exécuté, conservée par l'exécution pour la traçabilité. */
export const workflowSnapshotSchema = z
  .object({
    workflowId: identifiantSchema,
    nom: texteCourtSchema,
    /** Version du workflow au moment de l'exécution. */
    version: z.int().positive(),
    ...champsGrapheWorkflow,
    /** Valeurs des variables utilisées par l'exécution (les paramètres sont déjà résolus). */
    valeursVariables: valeursVariablesSchema.default({}),
  })
  .superRefine((graphe, contexte) => verifierReferences({ graphe, contexte }));

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
