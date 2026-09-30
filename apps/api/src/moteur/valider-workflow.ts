import { validerWorkflow, type ErreurWorkflow, type GrapheWorkflow } from '@workflow/shared';
import type { RegistreNoeuds } from '../noeuds/registre-noeuds';

interface ValiderWorkflowCompletParams {
  graphe: Pick<GrapheWorkflow, 'noeuds' | 'connexions'>;
  registre: RegistreNoeuds;
}

/**
 * Validation serveur d'un workflow : la même validation structurelle que l'éditeur
 * (types de nœuds, ports, compatibilité des types, cycles, entrées obligatoires),
 * plus les paramètres de chaque nœud contrôlés par son schéma Zod.
 */
export function validerWorkflowComplet({
  graphe,
  registre,
}: ValiderWorkflowCompletParams): ErreurWorkflow[] {
  const erreurs = validerWorkflow({ graphe, catalogue: registre.catalogue() });

  for (const noeud of graphe.noeuds) {
    const definition = registre.obtenir({ type: noeud.type });
    const resultat = definition?.parametres.safeParse(noeud.parametres);
    if (resultat && !resultat.success) {
      const details = resultat.error.issues
        .map((issue) => `${issue.path.join('.') || 'paramètres'} : ${issue.message}`)
        .join(' ; ');
      erreurs.push({
        code: 'parametres_invalides',
        noeudId: noeud.id,
        message: `${noeud.id} : paramètres invalides (${details})`,
      });
    }
  }

  return erreurs;
}
