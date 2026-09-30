import { z } from 'zod';
import { horodatageSchema } from './commun';

export const typesSol = [
  'argileux',
  'argilo_limoneux',
  'limoneux',
  'limono_sableux',
  'sableux',
  'calcaire',
  'humifere',
] as const;

export const libellesTypesSol: Readonly<Record<(typeof typesSol)[number], string>> = {
  argileux: 'Argileux',
  argilo_limoneux: 'Argilo-limoneux',
  limoneux: 'Limoneux',
  limono_sableux: 'Limono-sableux',
  sableux: 'Sableux',
  calcaire: 'Calcaire',
  humifere: 'Humifère',
};

export const systemesIrrigation = [
  'aspersion',
  'enrouleur',
  'pivot',
  'goutte_a_goutte',
  'gravitaire',
] as const;

export const libellesSystemesIrrigation: Readonly<
  Record<(typeof systemesIrrigation)[number], string>
> = {
  aspersion: 'Aspersion (couverture intégrale)',
  enrouleur: 'Enrouleur',
  pivot: 'Pivot / rampe',
  goutte_a_goutte: 'Goutte-à-goutte',
  gravitaire: 'Gravitaire',
};

/** Métadonnées d'une photo terrain : le fichier image lui-même n'est pas transmis. */
export const photoTerrainSchema = z.object({
  nom: z.string().min(1),
  typeMime: z.string(),
  tailleOctets: z.int().nonnegative(),
  /** Date de dernière modification du fichier (souvent la prise de vue). */
  modifieeLe: horodatageSchema.nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  legende: z.string().nullable(),
});

export type PhotoTerrain = z.infer<typeof photoTerrainSchema>;

/**
 * Saisie terrain normalisée. `null` = non renseigné : c'est au contrôle qualité
 * de décider si l'absence est bloquante.
 */
export const formulaireTerrainSchema = z.object({
  culture: z.string().nullable(),
  typeSol: z.enum(typesSol).nullable(),
  irrigation: z.object({
    /** `null` si non renseigné. */
    irriguee: z.boolean().nullable(),
    systeme: z.enum(systemesIrrigation).nullable(),
    volumeAnnuelM3Ha: z.number().nonnegative().nullable(),
  }),
  historique: z.array(
    z.object({
      annee: z.int(),
      culture: z.string().nullable(),
      rendementTHa: z.number().nonnegative().nullable(),
    }),
  ),
  photos: z.array(photoTerrainSchema),
  observations: z.string().nullable(),
});

export type FormulaireTerrain = z.infer<typeof formulaireTerrainSchema>;
