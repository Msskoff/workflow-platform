import type {
  CatalogueNoeuds,
  CategorieNoeud,
  ConnexionWorkflow,
  DescripteurNoeud,
  EtatNoeud,
  GrapheWorkflow,
  NoeudWorkflow,
} from '@workflow/shared';
import type { Connection, Edge, Node, XYPosition } from '@xyflow/react';

/** Données portées par un nœud React Flow de l'éditeur. */
export type DonneesNoeudEditeur = {
  descripteur: DescripteurNoeud;
  parametres: NoeudWorkflow['parametres'];
  /** État renvoyé par la dernière exécution, s'il y en a une. */
  etat?: EtatNoeud;
};

/** Clé du composant React Flow qui affiche les nœuds de workflow. */
export const TYPE_NOEUD_EDITEUR = 'workflow';

export type NoeudEditeur = Node<DonneesNoeudEditeur, typeof TYPE_NOEUD_EDITEUR>;

export const couleursCategorie: Readonly<Record<CategorieNoeud, string>> = {
  collecte: 'bg-sky-600',
  standardisation: 'bg-violet-600',
  analyse: 'bg-amber-600',
  decision: 'bg-emerald-700',
  restitution: 'bg-rose-600',
};

/** Catalogue de validation (ports par type de nœud) à partir des descripteurs de l'API. */
export function catalogueDepuis({
  descripteurs,
}: {
  descripteurs: readonly DescripteurNoeud[];
}): CatalogueNoeuds {
  return Object.fromEntries(descripteurs.map((descripteur) => [descripteur.id, descripteur]));
}

/** Nœuds et arêtes React Flow → graphe de workflow (format partagé avec l'API). */
export function versGraphe({
  noeuds,
  aretes,
}: {
  noeuds: readonly NoeudEditeur[];
  aretes: readonly Edge[];
}): GrapheWorkflow {
  return {
    noeuds: noeuds.map((noeud) => ({
      id: noeud.id,
      type: noeud.data.descripteur.id,
      parametres: noeud.data.parametres,
      position: { x: Math.round(noeud.position.x), y: Math.round(noeud.position.y) },
    })),
    connexions: aretes.flatMap((arete) => {
      const connexion = connexionDepuis({ connexion: arete });
      return connexion ? [{ ...connexion, id: arete.id }] : [];
    }),
  };
}

/** Connexion React Flow (poignées = noms de ports) → connexion de workflow sans identifiant. */
export function connexionDepuis({
  connexion,
}: {
  connexion: Connection | Edge;
}): Omit<ConnexionWorkflow, 'id'> | null {
  const { source, sourceHandle, target, targetHandle } = connexion;
  if (!sourceHandle || !targetHandle) {
    return null;
  }
  return { source, sourcePort: sourceHandle, cible: target, ciblePort: targetHandle };
}

/** Identifiant stable d'une connexion : `source.port->cible.port`. */
export function idConnexion({ connexion }: { connexion: Omit<ConnexionWorkflow, 'id'> }): string {
  return `${connexion.source}.${connexion.sourcePort}->${connexion.cible}.${connexion.ciblePort}`;
}

interface CreerNoeudParams {
  descripteur: DescripteurNoeud;
  position: XYPosition;
  idsExistants: ReadonlySet<string>;
}

/** Nouvelle instance d'un nœud, avec les paramètres par défaut de son type. */
export function creerNoeud({
  descripteur,
  position,
  idsExistants,
}: CreerNoeudParams): NoeudEditeur {
  const prefixe = descripteur.id.split('.').pop() ?? 'noeud';
  let rang = 1;
  while (idsExistants.has(`${prefixe}-${rang}`)) {
    rang += 1;
  }
  return {
    id: `${prefixe}-${rang}`,
    type: TYPE_NOEUD_EDITEUR,
    position,
    data: { descripteur, parametres: { ...descripteur.parametresParDefaut } },
  };
}

/** Pipeline de départ : collecte, reprojection et contrôle qualité d'une parcelle. */
const PIPELINE_DEMO = {
  noeuds: [
    { cle: 'gps', type: 'collecte.import_gps', position: { x: 0, y: 0 } },
    { cle: 'l93', type: 'standardisation.reprojection', position: { x: 320, y: 0 } },
    { cle: 'terrain', type: 'collecte.formulaire_terrain', position: { x: 320, y: 170 } },
    { cle: 'qc', type: 'standardisation.controle_qualite', position: { x: 640, y: 40 } },
  ],
  liens: [
    { source: 'gps', sourcePort: 'geometrie', cible: 'l93', ciblePort: 'geometrie' },
    { source: 'l93', sourcePort: 'geometrie', cible: 'qc', ciblePort: 'geometrie' },
    { source: 'terrain', sourcePort: 'formulaire', cible: 'qc', ciblePort: 'formulaire' },
  ],
} as const;

/** Graphe de départ de l'éditeur ; vide si le catalogue ne propose pas ces nœuds. */
export function grapheDemo({ descripteurs }: { descripteurs: readonly DescripteurNoeud[] }): {
  noeuds: NoeudEditeur[];
  aretes: Edge[];
} {
  const idsParCle = new Map<string, string>();
  const noeuds: NoeudEditeur[] = [];
  for (const { cle, type, position } of PIPELINE_DEMO.noeuds) {
    const descripteur = descripteurs.find((candidat) => candidat.id === type);
    if (!descripteur) {
      return { noeuds: [], aretes: [] };
    }
    const noeud = creerNoeud({
      descripteur,
      position,
      idsExistants: new Set(noeuds.map((existant) => existant.id)),
    });
    idsParCle.set(cle, noeud.id);
    noeuds.push(noeud);
  }

  const aretes = PIPELINE_DEMO.liens.map((lien) => {
    const connexion = {
      source: idsParCle.get(lien.source) ?? '',
      sourcePort: lien.sourcePort,
      cible: idsParCle.get(lien.cible) ?? '',
      ciblePort: lien.ciblePort,
    };
    return {
      id: idConnexion({ connexion }),
      source: connexion.source,
      sourceHandle: connexion.sourcePort,
      target: connexion.cible,
      targetHandle: connexion.ciblePort,
    };
  });
  return { noeuds, aretes };
}
