import { z } from 'zod';

/** Ligne de devis : un service facturé à l'hectare. */
export const ligneDevisSchema = z.object({
  service: z.string(),
  quantiteHa: z.number().nonnegative(),
  tarifHtParHa: z.number().nonnegative(),
  montantHt: z.number().nonnegative(),
});

export type LigneDevis = z.infer<typeof ligneDevisSchema>;

/**
 * Estimation chiffrée des services pour une parcelle (surface × tarifs).
 * C'est un devis indicatif : aucune facturation n'est gérée par la plateforme.
 */
export const devisSchema = z.object({
  surfaceHa: z.number().nonnegative(),
  /** Surface retenue pour le calcul (au moins le minimum facturable). */
  surfaceFactureeHa: z.number().nonnegative(),
  lignes: z.array(ligneDevisSchema),
  fraisFixesHt: z.number().nonnegative(),
  totalHt: z.number().nonnegative(),
  tauxTvaPourcent: z.number().nonnegative(),
  montantTva: z.number().nonnegative(),
  totalTtc: z.number().nonnegative(),
  devise: z.literal('EUR'),
});

export type Devis = z.infer<typeof devisSchema>;
