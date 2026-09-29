import { z } from 'zod';
import { identifiantSchema, texteCourtSchema } from './commun';

/** Nœud tel qu'il était au moment de l'exécution. */
export const noeudSnapshotSchema = z.object({
  id: identifiantSchema,
  /** Type de nœud (ex. `collecte.gps`, `decision.regle`). */
  type: texteCourtSchema,
  libelle: texteCourtSchema.optional(),
  parametres: z.record(z.string(), z.json()).default({}),
});

export type NoeudSnapshot = z.infer<typeof noeudSnapshotSchema>;

/** Connexion orientée entre deux nœuds du snapshot. */
export const connexionSnapshotSchema = z.object({
  id: identifiantSchema,
  source: identifiantSchema,
  cible: identifiantSchema,
});

export type ConnexionSnapshot = z.infer<typeof connexionSnapshotSchema>;

/**
 * Copie figée du workflow exécuté. Le modèle complet des nœuds typés viendra
 * avec l'éditeur ; ce snapshot en garde le minimum nécessaire à la traçabilité.
 */
export const workflowSnapshotSchema = z
  .object({
    workflowId: identifiantSchema,
    nom: texteCourtSchema,
    /** Version du workflow au moment de l'exécution. */
    version: z.int().positive(),
    noeuds: z.array(noeudSnapshotSchema).min(1),
    connexions: z.array(connexionSnapshotSchema),
  })
  .superRefine((snapshot, contexte) => {
    const idsNoeuds = new Set<string>();
    snapshot.noeuds.forEach((noeud, index) => {
      if (idsNoeuds.has(noeud.id)) {
        contexte.addIssue({
          code: 'custom',
          message: `Identifiant de nœud en double : ${noeud.id}`,
          path: ['noeuds', index, 'id'],
        });
      }
      idsNoeuds.add(noeud.id);
    });

    snapshot.connexions.forEach((connexion, index) => {
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
  });

export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
