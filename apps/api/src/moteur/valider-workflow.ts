import {
  champsReferencant,
  validerWorkflow,
  type ErreurWorkflow,
  type GrapheWorkflow,
} from '@workflow/shared';
import type { RegistreNoeuds } from '../noeuds/registre-noeuds';

interface ValiderWorkflowCompletParams {
  graphe: Pick<GrapheWorkflow, 'noeuds' | 'connexions'> &
    Partial<Pick<GrapheWorkflow, 'variables'>>;
  registre: RegistreNoeuds;
}

/**
 * Validation serveur d'un workflow : la même validation structurelle que l'éditeur
 * (types de nœuds, ports, compatibilité des types, cycles, entrées obligatoires, variables
 * déclarées), plus les paramètres de chaque nœud contrôlés par son schéma Zod.
 *
 * Un paramètre qui référence une variable (`${nom}`) n'est pas contrôlé ici : sa valeur
 * n'est connue qu'à l'exécution, où le graphe résolu est validé en entier.
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
      const referencant = new Set(champsReferencant({ parametres: noeud.parametres }));
      const issues = resultat.error.issues.filter(
        (issue) => !referencant.has(String(issue.path[0] ?? '')),
      );
      if (issues.length === 0) {
        continue;
      }
      const details = issues
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
