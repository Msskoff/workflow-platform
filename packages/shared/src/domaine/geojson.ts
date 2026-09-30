import { z } from 'zod';

const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

/** Position GeoJSON WGS84 : `[longitude, latitude]` ou `[longitude, latitude, altitude]`. */
export const positionSchema = z.union([
  z.tuple([longitudeSchema, latitudeSchema]),
  z.tuple([longitudeSchema, latitudeSchema, z.number()]),
]);

export type Position = z.infer<typeof positionSchema>;

function anneauEstFerme(anneau: readonly (readonly number[])[]): boolean {
  const premier = anneau[0];
  const dernier = anneau[anneau.length - 1];
  return (
    premier !== undefined &&
    dernier !== undefined &&
    premier[0] === dernier[0] &&
    premier[1] === dernier[1]
  );
}

/** Anneau linéaire fermé : au moins 4 positions, la première égale à la dernière. */
export const anneauSchema = z.array(positionSchema).min(4).refine(anneauEstFerme, {
  message: "L'anneau doit être fermé (premier point = dernier point)",
});

/** Polygone : anneau extérieur puis éventuels trous. */
export const polygoneSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(anneauSchema).min(1),
});

export const multiPolygoneSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(anneauSchema).min(1)).min(1),
});

/** Géométrie d'une parcelle : GeoJSON Polygon ou MultiPolygon valide, en WGS84. */
export const geometrieParcelleSchema = z.discriminatedUnion('type', [
  polygoneSchema,
  multiPolygoneSchema,
]);

export type GeometrieParcelle = z.infer<typeof geometrieParcelleSchema>;

/**
 * Position dans un système de coordonnées quelconque (degrés ou mètres) : `[x, y]` ou `[x, y, z]`.
 * Aucune borne : les valeurs dépendent du système de coordonnées.
 */
export const positionPlaneSchema = z.array(z.number()).min(2).max(3);

/**
 * Polygone ou MultiPolygon dont seule la structure est vérifiée (anneaux non fermés,
 * trop courts ou auto-intersectés acceptés). Sert à transporter une géométrie brute
 * jusqu'au contrôle qualité, qui en signale les défauts.
 */
export const geometriePlaneSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(positionPlaneSchema)),
  }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(positionPlaneSchema))),
  }),
]);

export type GeometriePlane = z.infer<typeof geometriePlaneSchema>;
