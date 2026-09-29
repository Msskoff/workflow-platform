import { z } from 'zod';
import { horodatageSchema, identifiantSchema, texteCourtSchema } from './commun';
import { geometrieParcelleSchema } from './geojson';

/** Parcelle d'un client. La surface est calculée par l'API à partir de la géométrie. */
export const parcelleSchema = z.object({
  id: identifiantSchema,
  clientId: identifiantSchema,
  nom: texteCourtSchema,
  geometrie: geometrieParcelleSchema,
  surfaceHa: z.number().nonnegative(),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Parcelle = z.infer<typeof parcelleSchema>;

export const creerParcelleSchema = z.object({
  clientId: identifiantSchema,
  nom: texteCourtSchema,
  geometrie: geometrieParcelleSchema,
});

export type CreerParcelle = z.infer<typeof creerParcelleSchema>;

/** Le client propriétaire n'est pas modifiable. */
export const modifierParcelleSchema = creerParcelleSchema.omit({ clientId: true }).partial();

export type ModifierParcelle = z.infer<typeof modifierParcelleSchema>;

export const filtreParcellesSchema = z.object({
  clientId: identifiantSchema.optional(),
});

export type FiltreParcelles = z.infer<typeof filtreParcellesSchema>;
