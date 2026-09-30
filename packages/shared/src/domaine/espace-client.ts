import { z } from 'zod';
import { dateCalendaireSchema, horodatageSchema, identifiantSchema } from './commun';
import { decisionClientSchema } from './decision';
import { rapportParcelleSchema } from './rapport';

/**
 * Espace client (lecture seule). Le client n'y voit que les analyses « publiées » :
 * exécutions terminées dont au moins une décision a été envoyée.
 */

export const campagneClientSchema = z.object({
  id: identifiantSchema,
  nom: z.string(),
  culture: z.string().nullable(),
  dateDebut: dateCalendaireSchema,
  dateFin: dateCalendaireSchema.nullable(),
});

export type CampagneClient = z.infer<typeof campagneClientSchema>;

/** Page d'accueil de l'espace client : ses parcelles. */
export const vueEspaceClientSchema = z.object({
  client: z.object({ nom: z.string() }),
  parcelles: z.array(
    z.object({
      id: identifiantSchema,
      nom: z.string(),
      surfaceHa: z.number(),
      campagnes: z.array(campagneClientSchema),
      /** Date de la dernière analyse publiée, `null` s'il n'y en a pas encore. */
      derniereAnalyse: horodatageSchema.nullable(),
    }),
  ),
});

export type VueEspaceClient = z.infer<typeof vueEspaceClientSchema>;

/** Analyse publiée : le contenu du rapport à la date de l'exécution. */
export const analysePublieeSchema = z.object({
  id: identifiantSchema,
  campagneId: identifiantSchema,
  date: horodatageSchema,
  rapport: rapportParcelleSchema,
});

export type AnalysePubliee = z.infer<typeof analysePublieeSchema>;

export const typesEvenement = [
  'debut_campagne',
  'analyse',
  'decision',
  'application',
  'fin_campagne',
] as const;

/** Étape de la saison, affichée dans la chronologie. */
export const evenementChronologieSchema = z.object({
  /** Date calendaire ou horodatage ISO. */
  date: z.string(),
  type: z.enum(typesEvenement),
  titre: z.string(),
  detail: z.string().nullable(),
  campagneId: identifiantSchema,
  /** Analyse concernée (analyse ou décision), `null` pour les dates de campagne. */
  analyseId: identifiantSchema.nullable(),
});

export type EvenementChronologie = z.infer<typeof evenementChronologieSchema>;

/** Tout ce que le client voit d'une parcelle. */
export const vueParcelleClientSchema = z.object({
  client: z.object({ nom: z.string() }),
  parcelle: z.object({ id: identifiantSchema, nom: z.string(), surfaceHa: z.number() }),
  campagnes: z.array(campagneClientSchema),
  /** Analyses publiées, de la plus récente à la plus ancienne. */
  analyses: z.array(analysePublieeSchema),
  /** Décisions envoyées, de la plus récente à la plus ancienne. */
  decisions: z.array(decisionClientSchema),
  chronologie: z.array(evenementChronologieSchema),
});

export type VueParcelleClient = z.infer<typeof vueParcelleClientSchema>;

/** Lien d'accès généré pour un client (le jeton n'est montré qu'une fois). */
export const accesClientSchema = z.object({
  jeton: z.string().min(32),
  creeLe: horodatageSchema,
});

export type AccesClient = z.infer<typeof accesClientSchema>;

/** Case « fait » cochée ou décochée par le fermier (ou l'agent terrain) dans son espace. */
export const marquerFaitSchema = z.object({ fait: z.boolean() });

export type MarquerFait = z.infer<typeof marquerFaitSchema>;
