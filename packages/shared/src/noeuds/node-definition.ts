import { z } from 'zod';
import type { GeometrieParcelle } from '../domaine/geojson';
import { typeDonneeSchema, type TypeDonnee, type ValeurDonnee } from './types-donnees';

/** Étapes du flux métier : collecte → standardisation → analyse → décision → restitution. */
export const categoriesNoeud = [
  'collecte',
  'standardisation',
  'analyse',
  'decision',
  'restitution',
] as const;

export const categorieNoeudSchema = z.enum(categoriesNoeud);

export type CategorieNoeud = z.infer<typeof categorieNoeudSchema>;

/** Indicateur publié par une sortie de type `indicateurs` (clé, libellé, unité). */
export interface IndicateurDefinition {
  cle: string;
  libelle: string;
  unite?: string;
}

/** Port d'entrée ou de sortie d'un nœud. */
export interface PortDefinition {
  type: TypeDonnee;
  libelle: string;
  /** Entrée facultative : peut rester non connectée. Ignoré pour les sorties. */
  optionnel?: boolean;
  /**
   * Entrée qui accepte plusieurs connexions : le nœud reçoit alors un tableau des valeurs,
   * dans l'ordre des connexions. Ignoré pour les sorties.
   */
  multiple?: boolean;
  /** Sorties de type `indicateurs` : indicateurs produits, proposés dans l'éditeur de règles. */
  indicateurs?: readonly IndicateurDefinition[];
}

/** Ports d'un nœud, indexés par nom de port. */
export type PortsDefinition = Readonly<Record<string, PortDefinition>>;

/**
 * Valeur reçue sur un port : un tableau pour une entrée déclarée `multiple: true`, une valeur
 * seule sinon. Pour un port quelconque (registre, moteur), les deux formes sont possibles.
 */
type ValeurPort<Port extends PortDefinition> = Port extends { multiple: true }
  ? ValeurDonnee<Port['type']>[]
  : // `type` évite la règle des types « faibles » (propriétés toutes optionnelles).
    Port extends { type: TypeDonnee; multiple?: false }
    ? ValeurDonnee<Port['type']>
    : ValeurDonnee<Port['type']> | ValeurDonnee<Port['type']>[];

type PortsObligatoires<Ports extends PortsDefinition> = {
  [Nom in keyof Ports as Ports[Nom]['optionnel'] extends true ? never : Nom]: ValeurPort<
    Ports[Nom]
  >;
};

type PortsOptionnels<Ports extends PortsDefinition> = {
  [Nom in keyof Ports as Ports[Nom]['optionnel'] extends true ? Nom : never]?: ValeurPort<
    Ports[Nom]
  >;
};

/** Valeurs typées d'un ensemble de ports (les ports optionnels peuvent être absents). */
export type ValeursPorts<Ports extends PortsDefinition> = PortsObligatoires<Ports> &
  PortsOptionnels<Ports>;

/** Parcelle telle qu'un nœud peut la lire (géométrie en WGS84). */
export interface ParcelleRessource {
  id: string;
  nom: string;
  geometrie: GeometrieParcelle;
}

/**
 * Données de la plateforme accessibles aux nœuds, en lecture seule. Fournies par l'API ;
 * absentes quand un nœud est exécuté hors plateforme (tests unitaires).
 */
export interface RessourcesExecution {
  lireParcelle(params: { id: string }): Promise<ParcelleRessource | null>;
}

/** Contexte fourni par le moteur à chaque exécution de nœud. */
export interface ExecutionContext {
  executionId: string;
  campagneId: string;
  /** Identifiant de l'instance du nœud dans le workflow. */
  noeudId: string;
  ressources?: RessourcesExecution;
}

export interface RunArgs<Entrees extends PortsDefinition, Parametres> {
  inputs: ValeursPorts<Entrees>;
  params: Parametres;
  context: ExecutionContext;
}

/**
 * Contrat commun de tous les nœuds. Un nœud = un module qui exporte une `NodeDefinition`.
 * Le moteur ne connaît que ce contrat : il valide les entrées et les paramètres,
 * appelle `run`, puis valide les sorties.
 */
export interface NodeDefinition<
  Entrees extends PortsDefinition = PortsDefinition,
  Sorties extends PortsDefinition = PortsDefinition,
  SchemaParametres extends z.ZodType = z.ZodType,
> {
  /** Identifiant unique du type de nœud, ex. `collecte.gps`. */
  id: string;
  categorie: CategorieNoeud;
  libelle: string;
  description: string;
  entrees: Entrees;
  sorties: Sorties;
  /** Schéma des paramètres ; ses valeurs par défaut servent à créer une instance. */
  parametres: SchemaParametres;
  run(args: RunArgs<Entrees, z.output<SchemaParametres>>): Promise<ValeursPorts<Sorties>>;
}

/**
 * Déclare un nœud en conservant le typage précis de ses ports :
 * `inputs`, `params` et la valeur de retour de `run` sont inférés.
 */
export function defineNode<
  const Entrees extends PortsDefinition,
  const Sorties extends PortsDefinition,
  SchemaParametres extends z.ZodType,
>(
  definition: NodeDefinition<Entrees, Sorties, SchemaParametres>,
): NodeDefinition<Entrees, Sorties, SchemaParametres> {
  return definition;
}

export const indicateurDefinitionSchema = z.object({
  cle: z.string(),
  libelle: z.string(),
  unite: z.string().optional(),
});

export const portDefinitionSchema = z.object({
  type: typeDonneeSchema,
  libelle: z.string(),
  optionnel: z.boolean().optional(),
  multiple: z.boolean().optional(),
  indicateurs: z.array(indicateurDefinitionSchema).optional(),
});

/**
 * Vue sérialisable d'un nœud, envoyée à l'éditeur : tout sauf `run`.
 * `parametres` est le JSON Schema des paramètres.
 */
export const descripteurNoeudSchema = z.object({
  id: z.string(),
  categorie: categorieNoeudSchema,
  libelle: z.string(),
  description: z.string(),
  entrees: z.record(z.string(), portDefinitionSchema),
  sorties: z.record(z.string(), portDefinitionSchema),
  parametres: z.record(z.string(), z.unknown()),
  parametresParDefaut: z.record(z.string(), z.json()),
});

export type DescripteurNoeud = z.infer<typeof descripteurNoeudSchema>;

/** Construit le descripteur sérialisable d'une définition de nœud. */
export function decrireNoeud({ definition }: { definition: NodeDefinition }): DescripteurNoeud {
  const parDefaut = definition.parametres.safeParse({});
  return descripteurNoeudSchema.parse({
    id: definition.id,
    categorie: definition.categorie,
    libelle: definition.libelle,
    description: definition.description,
    entrees: definition.entrees,
    sorties: definition.sorties,
    parametres: z.toJSONSchema(definition.parametres, { io: 'input' }),
    parametresParDefaut: parDefaut.success ? parDefaut.data : {},
  });
}
