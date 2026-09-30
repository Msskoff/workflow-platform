import { z } from 'zod';
import { formulaireTerrainSchema } from '../domaine/formulaire-terrain';
import { rapportQualiteSchema } from '../domaine/rapport-qualite';
import { geometrieGeoreferenceeSchema } from '../domaine/systemes-coordonnees';

/**
 * Catalogue des types de données qui circulent entre les ports des nœuds.
 * Chaque type porte le schéma Zod qui valide ses valeurs à l'exécution.
 * Ajouter un type (ex. série NDVI) = ajouter une entrée ici.
 */
export const typesDonnees = {
  nombre: { libelle: 'Nombre', schema: z.number() },
  texte: { libelle: 'Texte', schema: z.string() },
  booleen: { libelle: 'Booléen', schema: z.boolean() },
  geometrie: { libelle: 'Géométrie', schema: geometrieGeoreferenceeSchema },
  formulaire_terrain: { libelle: 'Formulaire terrain', schema: formulaireTerrainSchema },
  rapport_qualite: { libelle: 'Rapport qualité', schema: rapportQualiteSchema },
} as const satisfies Record<string, { libelle: string; schema: z.ZodType }>;

export type TypeDonnee = keyof typeof typesDonnees;

export const typeDonneeSchema = z.enum(Object.keys(typesDonnees) as [TypeDonnee, ...TypeDonnee[]]);

/** Type TypeScript des valeurs d'un type de données. */
export type ValeurDonnee<Type extends TypeDonnee> = z.output<(typeof typesDonnees)[Type]['schema']>;

/** Schéma Zod qui valide les valeurs d'un type de données. */
export function schemaDuType({ type }: { type: TypeDonnee }): z.ZodType<ValeurDonnee<TypeDonnee>> {
  return typesDonnees[type].schema;
}

interface TypesCompatiblesParams {
  /** Type de la sortie émettrice. */
  source: TypeDonnee;
  /** Type de l'entrée réceptrice. */
  cible: TypeDonnee;
}

/**
 * Règle de compatibilité entre une sortie et une entrée.
 * Pour l'instant : types identiques. C'est ici qu'on ajoutera d'éventuelles conversions.
 */
export function typesCompatibles({ source, cible }: TypesCompatiblesParams): boolean {
  return source === cible;
}
