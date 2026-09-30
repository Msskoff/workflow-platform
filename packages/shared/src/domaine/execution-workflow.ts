import { z } from 'zod';
import { horodatageSchema, identifiantSchema, type Transitions } from './commun';
import { workflowSnapshotSchema } from './workflow-snapshot';

export const statutsExecution = ['en_attente', 'en_cours', 'terminee', 'echouee'] as const;

export const statutExecutionSchema = z.enum(statutsExecution);

export type StatutExecution = z.infer<typeof statutExecutionSchema>;

/** Cycle de vie d'une exécution : les statuts finaux n'ont plus de transition. */
export const transitionsStatutExecution: Transitions<StatutExecution> = {
  en_attente: ['en_cours', 'echouee'],
  en_cours: ['terminee', 'echouee'],
  terminee: [],
  echouee: [],
};

export const statutsNoeud = ['en_attente', 'en_cours', 'ok', 'erreur'] as const;

export const statutNoeudSchema = z.enum(statutsNoeud);

export type StatutNoeud = z.infer<typeof statutNoeudSchema>;

/**
 * État d'un nœud au sein d'une exécution. Après une erreur, les nœuds suivants
 * restent `en_attente` : ils n'ont pas été exécutés.
 */
export const etatNoeudSchema = z.object({
  noeudId: identifiantSchema,
  statut: statutNoeudSchema,
  /** Valeurs produites sur chaque port de sortie (statut `ok`). */
  sorties: z.record(z.string(), z.json()).nullable(),
  erreur: z.string().nullable(),
  demarreLe: horodatageSchema.nullable(),
  termineLe: horodatageSchema.nullable(),
});

export type EtatNoeud = z.infer<typeof etatNoeudSchema>;

/**
 * Exécution d'un workflow pour une campagne.
 * `version` numérote les exécutions d'un même workflow sur une même campagne (1, 2, 3…).
 * `snapshot` et `empreinteSnapshot` sont figés à la création.
 */
export const executionWorkflowSchema = z.object({
  id: identifiantSchema,
  campagneId: identifiantSchema,
  workflowId: identifiantSchema,
  version: z.int().positive(),
  snapshot: workflowSnapshotSchema,
  empreinteSnapshot: z.string().regex(/^[a-f0-9]{64}$/),
  statut: statutExecutionSchema,
  erreur: z.string().nullable(),
  demarreeLe: horodatageSchema.nullable(),
  termineeLe: horodatageSchema.nullable(),
  /** Un état par nœud du snapshot, dans l'ordre du snapshot. */
  noeuds: z.array(etatNoeudSchema),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type ExecutionWorkflow = z.infer<typeof executionWorkflowSchema>;

export const creerExecutionWorkflowSchema = z.object({
  campagneId: identifiantSchema,
  snapshot: workflowSnapshotSchema,
});

export type CreerExecutionWorkflow = z.infer<typeof creerExecutionWorkflowSchema>;

/** Seul le statut évolue ; `erreur` n'est accepté que pour passer à `echouee`. */
export const modifierExecutionWorkflowSchema = z.object({
  statut: statutExecutionSchema,
  erreur: z.string().trim().min(1).max(2000).optional(),
});

export type ModifierExecutionWorkflow = z.infer<typeof modifierExecutionWorkflowSchema>;

export const filtreExecutionsSchema = z.object({
  campagneId: identifiantSchema.optional(),
  workflowId: identifiantSchema.optional(),
  statut: statutExecutionSchema.optional(),
});

export type FiltreExecutions = z.infer<typeof filtreExecutionsSchema>;
