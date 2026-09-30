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

type IndicateurPublie = NonNullable<DescripteurNoeud['sorties'][string]['indicateurs']>[number];

/**
 * Indicateurs qui arrivent sur les entrées de type `indicateurs` d'un nœud : ceux que
 * déclarent les sorties amont connectées. Sans doublon, dans l'ordre des connexions.
 */
export function indicateursEnAmont({
  noeudId,
  noeuds,
  aretes,
}: {
  noeudId: string;
  noeuds: readonly NoeudEditeur[];
  aretes: readonly Edge[];
}): IndicateurPublie[] {
  const parId = new Map(noeuds.map((noeud) => [noeud.id, noeud]));
  const cible = parId.get(noeudId);
  const publies = aretes
    .filter(
      (arete) =>
        arete.target === noeudId &&
        arete.targetHandle &&
        cible?.data.descripteur.entrees[arete.targetHandle]?.type === 'indicateurs',
    )
    .flatMap((arete) =>
      arete.sourceHandle
        ? (parId.get(arete.source)?.data.descripteur.sorties[arete.sourceHandle]?.indicateurs ?? [])
        : [],
    );
  return publies.filter(
    (indicateur, index) => publies.findIndex((autre) => autre.cle === indicateur.cle) === index,
  );
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

/**
 * Pipeline de départ : collecte et contrôle qualité (haut), puis analyse, règles métier
 * et devis (bas), du contour GPS jusqu'aux décisions.
 */
const PIPELINE_DEMO = {
  noeuds: [
    { cle: 'gps', type: 'collecte.import_gps', position: { x: 0, y: 120 } },
    { cle: 'l93', type: 'standardisation.reprojection', position: { x: 320, y: 0 } },
    { cle: 'terrain', type: 'collecte.formulaire_terrain', position: { x: 320, y: 150 } },
    { cle: 'qc', type: 'standardisation.controle_qualite', position: { x: 640, y: 40 } },
    { cle: 'surface', type: 'analyse.surface_perimetre', position: { x: 320, y: 300 } },
    { cle: 'ndvi', type: 'analyse.ndvi', position: { x: 320, y: 480 } },
    { cle: 'zonage', type: 'analyse.zonage', position: { x: 640, y: 520 } },
    { cle: 'regles', type: 'decision.regles_metier', position: { x: 960, y: 360 } },
    { cle: 'devis', type: 'restitution.devis', position: { x: 640, y: 280 } },
  ],
  liens: [
    { source: 'gps', sourcePort: 'geometrie', cible: 'l93', ciblePort: 'geometrie' },
    { source: 'l93', sourcePort: 'geometrie', cible: 'qc', ciblePort: 'geometrie' },
    { source: 'terrain', sourcePort: 'formulaire', cible: 'qc', ciblePort: 'formulaire' },
    { source: 'gps', sourcePort: 'geometrie', cible: 'surface', ciblePort: 'geometrie' },
    { source: 'gps', sourcePort: 'geometrie', cible: 'ndvi', ciblePort: 'geometrie' },
    { source: 'ndvi', sourcePort: 'raster', cible: 'zonage', ciblePort: 'raster' },
    { source: 'surface', sourcePort: 'surfaceHa', cible: 'devis', ciblePort: 'surfaceHa' },
    { source: 'surface', sourcePort: 'indicateurs', cible: 'regles', ciblePort: 'indicateurs' },
    { source: 'ndvi', sourcePort: 'indicateurs', cible: 'regles', ciblePort: 'indicateurs' },
    { source: 'zonage', sourcePort: 'indicateurs', cible: 'regles', ciblePort: 'indicateurs' },
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

/** Widgets dont la valeur est une donnée de parcelle (fichier, photos), pas un réglage. */
const WIDGETS_DONNEES = new Set(['fichier-texte', 'fichier-binaire', 'photos']);

type ProprieteParametre = { widget?: string; champNomFichier?: string };

/**
 * Graphe à enregistrer comme modèle : on retire les données chargées (fichier GPS, image,
 * photos) pour ne garder que les réglages. Un modèle ne transporte pas les données d'un client.
 */
export function grapheSansDonnees({
  graphe,
  descripteurs,
}: {
  graphe: GrapheWorkflow;
  descripteurs: readonly DescripteurNoeud[];
}): GrapheWorkflow {
  return {
    connexions: graphe.connexions,
    noeuds: graphe.noeuds.map((noeud) => {
      const proprietes = (descripteurs.find((descripteur) => descripteur.id === noeud.type)
        ?.parametres.properties ?? {}) as Record<string, ProprieteParametre>;
      const aRetirer = new Set(
        Object.entries(proprietes).flatMap(([nom, propriete]) =>
          WIDGETS_DONNEES.has(propriete.widget ?? '')
            ? [nom, ...(propriete.champNomFichier ? [propriete.champNomFichier] : [])]
            : [],
        ),
      );
      return {
        ...noeud,
        parametres: Object.fromEntries(
          Object.entries(noeud.parametres).filter(([nom]) => !aRetirer.has(nom)),
        ),
      };
    }),
  };
}

/**
 * Nœuds et arêtes React Flow d'un modèle. Les paramètres du modèle complètent les valeurs
 * par défaut de chaque type ; un type absent du catalogue est ignoré et signalé.
 */
export function grapheDepuisModele({
  graphe,
  descripteurs,
}: {
  graphe: GrapheWorkflow;
  descripteurs: readonly DescripteurNoeud[];
}): { noeuds: NoeudEditeur[]; aretes: Edge[]; typesInconnus: string[] } {
  const typesInconnus: string[] = [];
  const noeuds = graphe.noeuds.flatMap((noeud, rang): NoeudEditeur[] => {
    const descripteur = descripteurs.find((candidat) => candidat.id === noeud.type);
    if (!descripteur) {
      typesInconnus.push(noeud.type);
      return [];
    }
    return [
      {
        id: noeud.id,
        type: TYPE_NOEUD_EDITEUR,
        position: noeud.position ?? { x: (rang % 4) * 300, y: Math.floor(rang / 4) * 220 },
        data: {
          descripteur,
          parametres: { ...descripteur.parametresParDefaut, ...noeud.parametres },
        },
      },
    ];
  });
  const presents = new Set(noeuds.map((noeud) => noeud.id));
  const aretes = graphe.connexions
    .filter((connexion) => presents.has(connexion.source) && presents.has(connexion.cible))
    .map((connexion) => ({
      id: connexion.id,
      source: connexion.source,
      sourceHandle: connexion.sourcePort,
      target: connexion.cible,
      targetHandle: connexion.ciblePort,
    }));
  return { noeuds, aretes, typesInconnus };
}
