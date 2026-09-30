/** Structure minimale d'un graphe orienté de nœuds. */
export interface GrapheOriente {
  noeuds: readonly { id: string }[];
  connexions: readonly { source: string; cible: string }[];
}

export type ResultatTriTopologique =
  { ok: true; ordre: string[] } | { ok: false; noeudsEnCycle: string[] };

/**
 * Tri topologique (algorithme de Kahn). Stable : à égalité, l'ordre de déclaration
 * des nœuds est conservé. En cas de cycle, renvoie les nœuds impliqués.
 */
export function trierTopologiquement({
  graphe,
}: {
  graphe: GrapheOriente;
}): ResultatTriTopologique {
  const degresEntrants = new Map(graphe.noeuds.map((noeud) => [noeud.id, 0]));
  const successeurs = new Map<string, string[]>(graphe.noeuds.map((noeud) => [noeud.id, []]));

  for (const { source, cible } of graphe.connexions) {
    successeurs.get(source)?.push(cible);
    degresEntrants.set(cible, (degresEntrants.get(cible) ?? 0) + 1);
  }

  const file = graphe.noeuds.map((noeud) => noeud.id).filter((id) => degresEntrants.get(id) === 0);
  const ordre: string[] = [];

  for (let courant = file.shift(); courant !== undefined; courant = file.shift()) {
    ordre.push(courant);
    for (const successeur of successeurs.get(courant) ?? []) {
      const degre = (degresEntrants.get(successeur) ?? 0) - 1;
      degresEntrants.set(successeur, degre);
      if (degre === 0) {
        file.push(successeur);
      }
    }
  }

  if (ordre.length === graphe.noeuds.length) {
    return { ok: true, ordre };
  }
  const tries = new Set(ordre);
  return {
    ok: false,
    noeudsEnCycle: graphe.noeuds.map((noeud) => noeud.id).filter((id) => !tries.has(id)),
  };
}

interface EstAtteignableParams {
  graphe: GrapheOriente;
  depuis: string;
  vers: string;
}

/** Indique s'il existe un chemin orienté `depuis → … → vers`. */
export function estAtteignable({ graphe, depuis, vers }: EstAtteignableParams): boolean {
  const aVisiter = [depuis];
  const visites = new Set<string>();
  for (let courant = aVisiter.pop(); courant !== undefined; courant = aVisiter.pop()) {
    if (courant === vers) {
      return true;
    }
    if (visites.has(courant)) {
      continue;
    }
    visites.add(courant);
    for (const connexion of graphe.connexions) {
      if (connexion.source === courant) {
        aVisiter.push(connexion.cible);
      }
    }
  }
  return false;
}
