import { z } from 'zod';
import { horodatageSchema, identifiantSchema, texteCourtSchema } from './commun';

/** Origines possibles d'une donnée collectée. */
export const typesDonneeBrute = ['gps', 'formulaire_terrain', 'image_sentinel2'] as const;

export const typeDonneeBruteSchema = z.enum(typesDonneeBrute);

export type TypeDonneeBrute = z.infer<typeof typeDonneeBruteSchema>;

/**
 * Contenu importé, conservé tel quel : objet ou tableau JSON.
 * Pour une image Sentinel-2, ce sont les métadonnées de la scène (identifiant, date, bandes),
 * pas le fichier image lui-même.
 */
export const contenuDonneeBruteSchema = z.union([
  z.record(z.string(), z.json()),
  z.array(z.json()),
]);

/**
 * Donnée brute importée pour une campagne. IMMUABLE : jamais modifiée ni supprimée.
 * `empreinte` est le SHA-256 du contenu sérialisé canoniquement, pour contrôler son intégrité.
 */
export const donneeBruteSchema = z.object({
  id: identifiantSchema,
  campagneId: identifiantSchema,
  type: typeDonneeBruteSchema,
  source: texteCourtSchema,
  contenu: contenuDonneeBruteSchema,
  empreinte: z.string().regex(/^[a-f0-9]{64}$/),
  importeeLe: horodatageSchema,
});

export type DonneeBrute = z.infer<typeof donneeBruteSchema>;

export const importerDonneeBruteSchema = z.object({
  campagneId: identifiantSchema,
  type: typeDonneeBruteSchema,
  /** Provenance lisible : nom de fichier, appareil, identifiant de scène… */
  source: texteCourtSchema,
  contenu: contenuDonneeBruteSchema,
});

export type ImporterDonneeBrute = z.infer<typeof importerDonneeBruteSchema>;

export const filtreDonneesBrutesSchema = z.object({
  campagneId: identifiantSchema.optional(),
  type: typeDonneeBruteSchema.optional(),
});

export type FiltreDonneesBrutes = z.infer<typeof filtreDonneesBrutesSchema>;
