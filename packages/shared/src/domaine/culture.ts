import { z } from 'zod';
import {
  dateCalendaireSchema,
  horodatageSchema,
  identifiantSchema,
  texteCourtSchema,
} from './commun';

/**
 * Culture : cycle et stades phénologiques, avec les interventions habituelles de chaque stade.
 * Sert à proposer les modèles de workflow adaptés et un calendrier prévisionnel
 * à la création d'une campagne.
 */

export const typesIntervention = [
  'analyse_satellite',
  'fertilisation',
  'traitement',
  'observation',
  'entretien',
  'recolte',
] as const;

export const typeInterventionSchema = z.enum(typesIntervention);

export type TypeIntervention = z.infer<typeof typeInterventionSchema>;

export const libellesTypesIntervention: Readonly<Record<TypeIntervention, string>> = {
  analyse_satellite: 'Analyse satellite',
  fertilisation: 'Fertilisation',
  traitement: 'Traitement',
  observation: 'Observation terrain',
  entretien: 'Entretien (taille, désherbage)',
  recolte: 'Récolte',
};

/** Code court et stable : minuscules, chiffres et tirets (`floraison`, `apport-uree`). */
const codeSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Code attendu en minuscules, chiffres et tirets');

export const interventionTypeSchema = z.object({
  code: codeSchema,
  libelle: texteCourtSchema,
  type: typeInterventionSchema,
  /** Jours après le début du stade (0 = premier jour du stade). */
  decalageJours: z.int().min(0).max(1000),
});

export type InterventionType = z.infer<typeof interventionTypeSchema>;

export const stadePhenologiqueSchema = z.object({
  code: codeSchema,
  nom: texteCourtSchema,
  dureeJours: z.int().min(1).max(1000),
  interventions: z.array(interventionTypeSchema).max(20),
});

export type StadePhenologique = z.infer<typeof stadePhenologiqueSchema>;

interface CultureACoherer {
  cycleJours: number;
  stades: readonly StadePhenologique[];
}

/** Problèmes de cohérence d'une culture (vide si tout va bien). */
export function problemesCulture({ cycleJours, stades }: CultureACoherer): string[] {
  const problemes: string[] = [];
  const total = stades.reduce((somme, stade) => somme + stade.dureeJours, 0);
  if (total !== cycleJours) {
    problemes.push(
      `La somme des durées des stades (${total} j) doit égaler le cycle (${cycleJours} j)`,
    );
  }
  const codesStades = stades.map((stade) => stade.code);
  if (new Set(codesStades).size !== codesStades.length) {
    problemes.push('Deux stades portent le même code');
  }
  const codesInterventions = stades.flatMap((stade) => stade.interventions.map(({ code }) => code));
  if (new Set(codesInterventions).size !== codesInterventions.length) {
    problemes.push('Deux interventions portent le même code');
  }
  for (const stade of stades) {
    for (const intervention of stade.interventions) {
      if (intervention.decalageJours >= stade.dureeJours) {
        problemes.push(
          `« ${intervention.libelle} » tombe après la fin du stade « ${stade.nom} » (${stade.dureeJours} j)`,
        );
      }
    }
  }
  return problemes;
}

/** Ajoute les problèmes de cohérence d'une culture à un contexte de validation Zod. */
function verifierCoherence({
  culture,
  contexte,
}: {
  culture: CultureACoherer;
  contexte: z.RefinementCtx;
}): void {
  for (const message of problemesCulture(culture)) {
    contexte.addIssue({ code: 'custom', message, path: ['stades'] });
  }
}

const champsCultureSchema = z.object({
  code: codeSchema,
  nom: texteCourtSchema,
  nomScientifique: z.string().trim().max(120).nullable(),
  /** Durée d'une campagne, du semis (ou du début de saison) à la récolte. */
  cycleJours: z.int().min(1).max(1000),
  stades: z.array(stadePhenologiqueSchema).min(1).max(20),
  /** Valeurs indicatives, à faire valider par un agronome avant usage en conseil. */
  aValider: z.boolean(),
  /** Précisions sur l'origine des valeurs et ce qu'il reste à vérifier. */
  noteValidation: z.string().trim().max(1000),
});

export const cultureSchema = champsCultureSchema.extend({
  id: identifiantSchema,
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Culture = z.infer<typeof cultureSchema>;

export const creerCultureSchema = champsCultureSchema.superRefine((culture, contexte) =>
  verifierCoherence({ culture, contexte }),
);

export type CreerCulture = z.infer<typeof creerCultureSchema>;

/** Le code est stable ; la cohérence cycle/stades est revérifiée par l'API après fusion. */
export const modifierCultureSchema = champsCultureSchema.omit({ code: true }).partial();

export type ModifierCulture = z.infer<typeof modifierCultureSchema>;

/** Dose de référence associée à une intervention type de la culture (par son code). */
export const doseReferenceSchema = z.object({
  intervention: codeSchema,
  intrant: z.string().trim().min(1).max(120),
  dose: z.number().positive().max(100_000),
  unite: z.string().trim().min(1).max(20),
});

export type DoseReference = z.infer<typeof doseReferenceSchema>;

export const stadeCalendrierSchema = z.object({
  code: z.string(),
  nom: z.string(),
  debut: dateCalendaireSchema,
  fin: dateCalendaireSchema,
});

export const interventionPrevueSchema = z.object({
  date: dateCalendaireSchema,
  stade: z.object({ code: z.string(), nom: z.string() }),
  code: z.string(),
  libelle: z.string(),
  type: typeInterventionSchema,
  /** Dose de référence du modèle proposé, s'il en fixe une pour cette intervention. */
  dose: doseReferenceSchema.omit({ intervention: true }).nullable(),
});

export type InterventionPrevue = z.infer<typeof interventionPrevueSchema>;

export const calendrierPrevisionnelSchema = z.object({
  dateDebut: dateCalendaireSchema,
  dateFinPrevue: dateCalendaireSchema,
  stades: z.array(stadeCalendrierSchema),
  interventions: z.array(interventionPrevueSchema),
});

export type CalendrierPrevisionnel = z.infer<typeof calendrierPrevisionnelSchema>;

/** Date calendaire + n jours (calcul en UTC, sans effet d'heure d'été). */
export function ajouterJours({ date, jours }: { date: string; jours: number }): string {
  const [annee = 0, mois = 1, jour = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour + jours)).toISOString().slice(0, 10);
}

interface CalculerCalendrierParams {
  culture: Pick<Culture, 'stades'>;
  dateDebut: string;
  dosesReference?: readonly DoseReference[];
}

/**
 * Calendrier prévisionnel d'une campagne : dates de chaque stade à partir du début de campagne,
 * puis interventions datées, triées, avec la dose de référence du modèle quand il y en a une.
 */
export function calculerCalendrier({
  culture,
  dateDebut,
  dosesReference = [],
}: CalculerCalendrierParams): CalendrierPrevisionnel {
  const doses = new Map(dosesReference.map((dose) => [dose.intervention, dose]));
  const stades: CalendrierPrevisionnel['stades'] = [];
  const interventions: InterventionPrevue[] = [];
  let decalage = 0;
  for (const stade of culture.stades) {
    const debut = ajouterJours({ date: dateDebut, jours: decalage });
    stades.push({
      code: stade.code,
      nom: stade.nom,
      debut,
      fin: ajouterJours({ date: debut, jours: stade.dureeJours - 1 }),
    });
    for (const intervention of stade.interventions) {
      const dose = doses.get(intervention.code);
      interventions.push({
        date: ajouterJours({ date: debut, jours: intervention.decalageJours }),
        stade: { code: stade.code, nom: stade.nom },
        code: intervention.code,
        libelle: intervention.libelle,
        type: intervention.type,
        dose: dose ? { intrant: dose.intrant, dose: dose.dose, unite: dose.unite } : null,
      });
    }
    decalage += stade.dureeJours;
  }
  return {
    dateDebut,
    dateFinPrevue: ajouterJours({ date: dateDebut, jours: Math.max(decalage - 1, 0) }),
    stades,
    interventions: interventions.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
