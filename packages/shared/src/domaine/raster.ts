import { z } from 'zod';
import { codeCrsSchema } from './systemes-coordonnees';

/**
 * Grille régulière géoréférencée : origine = coin haut-gauche, `resolutionY` négative
 * pour une image orientée nord en haut. Les valeurs sont rangées ligne par ligne.
 */
const grilleSchema = z.object({
  crs: codeCrsSchema,
  largeur: z.int().positive(),
  hauteur: z.int().positive(),
  origineX: z.number(),
  origineY: z.number(),
  resolutionX: z.number(),
  resolutionY: z.number(),
  /** Surface d'un pixel au sol, en m². */
  surfacePixelM2: z.number().positive(),
});

function tailleCoherente({
  largeur,
  hauteur,
  valeurs,
}: {
  largeur: number;
  hauteur: number;
  valeurs: unknown[];
}) {
  return valeurs.length === largeur * hauteur;
}

/** NDVI par pixel, `null` hors parcelle ou sans donnée valide. */
export const rasterNdviSchema = grilleSchema
  .extend({ valeurs: z.array(z.number().min(-1).max(1).nullable()) })
  .refine(tailleCoherente, { message: 'Le nombre de valeurs doit valoir largeur × hauteur' });

export type RasterNdvi = z.infer<typeof rasterNdviSchema>;

export const zoneSchema = z.object({
  /** 1 = zone au NDVI le plus faible. */
  numero: z.int().positive(),
  ndviMin: z.number(),
  ndviMax: z.number(),
  ndviMoyen: z.number(),
  nombrePixels: z.int().nonnegative(),
  surfaceHa: z.number().nonnegative(),
  /** Part de la surface zonée, en %. */
  partSurface: z.number().min(0).max(100),
});

export type Zone = z.infer<typeof zoneSchema>;

/** Zonage intra-parcellaire : numéro de zone par pixel et statistiques par zone. */
export const zonageSchema = grilleSchema
  .extend({
    classes: z.array(z.int().positive().nullable()),
    zones: z.array(zoneSchema),
  })
  .refine(
    ({ largeur, hauteur, classes }) => tailleCoherente({ largeur, hauteur, valeurs: classes }),
    {
      message: 'Le nombre de classes doit valoir largeur × hauteur',
    },
  );

export type Zonage = z.infer<typeof zonageSchema>;
