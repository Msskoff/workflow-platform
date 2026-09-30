import { z } from 'zod';

/** Un constat du contrôle qualité : code stable, message lisible, élément concerné. */
export const constatQualiteSchema = z.object({
  code: z.string(),
  message: z.string(),
  /** Élément concerné, ex. `geometrie.polygone[0].anneau[1]`, `formulaire.culture`. */
  cible: z.string().optional(),
});

export type ConstatQualite = z.infer<typeof constatQualiteSchema>;

/**
 * Rapport structuré du contrôle qualité. Une erreur rend les données inexploitables,
 * un avertissement signale une donnée à vérifier ou à compléter.
 */
export const rapportQualiteSchema = z.object({
  conforme: z.boolean(),
  erreurs: z.array(constatQualiteSchema),
  avertissements: z.array(constatQualiteSchema),
  /** Mesures calculées pendant le contrôle (surface, nombre de sommets…). */
  indicateurs: z.record(z.string(), z.number()),
});

export type RapportQualite = z.infer<typeof rapportQualiteSchema>;
