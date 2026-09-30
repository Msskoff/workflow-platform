import { z } from 'zod';
import { horodatageSchema, identifiantSchema, texteCourtSchema } from './commun';
import { valeursVariablesSchema } from './variables-workflow';

/**
 * Exécution par lot : un même workflow lancé sur N parcelles. Chaque parcelle est une tâche
 * de la file, traitée indépendamment (un échec ne bloque pas les autres), relancée
 * automatiquement quelques fois, puis relançable à la main.
 */

export const statutsTacheLot = ['en_attente', 'en_cours', 'reussie', 'echouee'] as const;

export const statutTacheLotSchema = z.enum(statutsTacheLot);

export type StatutTacheLot = z.infer<typeof statutTacheLotSchema>;

export const libellesStatutsTacheLot: Readonly<Record<StatutTacheLot, string>> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  reussie: 'Réussie',
  echouee: 'Échouée',
};

export const statutsLot = ['en_cours', 'termine', 'termine_avec_echecs'] as const;

export type StatutLot = (typeof statutsLot)[number];

export const libellesStatutsLot: Readonly<Record<StatutLot, string>> = {
  en_cours: 'En cours',
  termine: 'Terminé',
  termine_avec_echecs: 'Terminé avec des échecs',
};

export const tacheLotSchema = z.object({
  id: identifiantSchema,
  parcelle: z.object({ id: identifiantSchema, nom: z.string() }),
  client: z.object({ id: identifiantSchema, nom: z.string() }),
  /** Campagne exécutée (la plus récente de la parcelle) ; `null` si la parcelle n'en a pas. */
  campagne: z.object({ id: identifiantSchema, nom: z.string() }).nullable(),
  statut: statutTacheLotSchema,
  tentatives: z.int().nonnegative(),
  maxTentatives: z.int().positive(),
  erreur: z.string().nullable(),
  /** Dernière exécution lancée pour cette parcelle. */
  executionId: z.string().nullable(),
  prochaineTentativeLe: horodatageSchema.nullable(),
  termineeLe: horodatageSchema.nullable(),
});

export type TacheLot = z.infer<typeof tacheLotSchema>;

export const progressionLotSchema = z.object({
  total: z.int().nonnegative(),
  enAttente: z.int().nonnegative(),
  enCours: z.int().nonnegative(),
  reussies: z.int().nonnegative(),
  echouees: z.int().nonnegative(),
  /** Part des tâches terminées (réussies ou échouées), en %. */
  pourcentage: z.number().min(0).max(100),
});

export type ProgressionLot = z.infer<typeof progressionLotSchema>;

/** Avancement d'un lot et son statut global, à partir des statuts de ses tâches. */
export function calculerProgression({ statuts }: { statuts: readonly StatutTacheLot[] }): {
  progression: ProgressionLot;
  statut: StatutLot;
} {
  const compter = (statut: StatutTacheLot) =>
    statuts.filter((courant) => courant === statut).length;
  const progression = {
    total: statuts.length,
    enAttente: compter('en_attente'),
    enCours: compter('en_cours'),
    reussies: compter('reussie'),
    echouees: compter('echouee'),
    pourcentage: 0,
  };
  const terminees = progression.reussies + progression.echouees;
  progression.pourcentage =
    statuts.length === 0 ? 100 : Math.round((terminees / statuts.length) * 1000) / 10;
  const statut: StatutLot =
    terminees < statuts.length
      ? 'en_cours'
      : progression.echouees > 0
        ? 'termine_avec_echecs'
        : 'termine';
  return { progression, statut };
}

export const resumeLotSchema = z.object({
  id: identifiantSchema,
  nom: z.string(),
  modele: z.object({ id: z.string().nullable(), nom: z.string() }),
  /** Valeurs communes des variables (les fichiers sont résumés par leur taille). */
  valeurs: z.record(z.string(), z.union([z.string(), z.number()])),
  statut: z.enum(statutsLot),
  progression: progressionLotSchema,
  creeLe: horodatageSchema,
});

export type ResumeLot = z.infer<typeof resumeLotSchema>;

export const lotSchema = resumeLotSchema.extend({ taches: z.array(tacheLotSchema) });

export type Lot = z.infer<typeof lotSchema>;

export const creerLotSchema = z.object({
  modeleId: identifiantSchema,
  nom: texteCourtSchema.optional(),
  parcelleIds: z
    .array(identifiantSchema)
    .min(1, 'Sélectionnez au moins une parcelle')
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Une parcelle est sélectionnée deux fois'),
  /** Valeurs communes à toutes les parcelles ; les variables `parcelle` sont remplies par tâche. */
  valeurs: valeursVariablesSchema.default({}),
});

export type CreerLot = z.infer<typeof creerLotSchema>;
