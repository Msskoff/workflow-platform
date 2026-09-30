import {
  comparer,
  interpolerExplication,
  type Indicateurs,
  type RegleMetier,
  type ResultatRegles,
} from '@workflow/shared';

interface EvaluerReglesParams {
  regles: readonly RegleMetier[];
  /** Indicateurs disponibles (fusion de toutes les entrées). */
  indicateurs: Indicateurs;
  /** Libellés lisibles des indicateurs, pour `{indicateur}` dans les explications. */
  libelles: Readonly<Record<string, string>>;
}

/**
 * Évalue chaque règle active sur les indicateurs reçus. Une règle dont la condition est
 * vraie produit une décision proposée avec son explication (le « pourquoi ») et son motif
 * (indicateur, valeur mesurée, opérateur, seuil). Une règle dont l'indicateur manque est
 * signalée comme ignorée plutôt que de faire échouer le workflow.
 */
export function evaluerRegles({
  regles,
  indicateurs,
  libelles,
}: EvaluerReglesParams): ResultatRegles {
  const resultat: ResultatRegles = { declenchees: [], ignorees: [], nombreEvaluees: 0 };

  for (const regle of regles.filter((candidate) => candidate.active)) {
    const valeur = indicateurs[regle.indicateur];
    if (valeur === undefined) {
      resultat.ignorees.push({
        regleId: regle.id,
        regleNom: regle.nom,
        raison: `Indicateur « ${regle.indicateur} » absent des entrées`,
      });
      continue;
    }
    resultat.nombreEvaluees += 1;
    if (!comparer({ valeur, operateur: regle.operateur, seuil: regle.seuil })) {
      continue;
    }
    resultat.declenchees.push({
      regleId: regle.id,
      regleNom: regle.nom,
      priorite: regle.priorite,
      recommandation: regle.recommandation,
      explication: interpolerExplication({
        modele: regle.explication,
        valeur,
        seuil: regle.seuil,
        indicateur: libelles[regle.indicateur] ?? regle.indicateur,
      }),
      motif: {
        indicateur: regle.indicateur,
        valeur,
        operateur: regle.operateur,
        seuil: regle.seuil,
      },
    });
  }
  return resultat;
}
