import { z } from 'zod';
import {
  dateCalendaireSchema,
  horodatageSchema,
  identifiantSchema,
  texteCourtSchema,
} from './commun';

/** Campagne (saison culturale) sur une parcelle. */
export const campagneSchema = z.object({
  id: identifiantSchema,
  parcelleId: identifiantSchema,
  nom: texteCourtSchema,
  /** Culture choisie dans le référentiel ; `null` pour une culture saisie librement. */
  cultureId: identifiantSchema.nullable(),
  /** Nom de la culture (celui du référentiel si `cultureId` est renseigné). */
  culture: z.string().nullable(),
  dateDebut: dateCalendaireSchema,
  dateFin: dateCalendaireSchema.nullable(),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Campagne = z.infer<typeof campagneSchema>;

interface DatesCampagneCoherentesParams {
  dateDebut: string;
  dateFin?: string | null;
}

/** Une campagne sans date de fin est en cours ; sinon la fin ne précède pas le début. */
export function datesCampagneCoherentes({
  dateDebut,
  dateFin,
}: DatesCampagneCoherentesParams): boolean {
  return dateFin === undefined || dateFin === null || dateFin >= dateDebut;
}

export const MESSAGE_DATES_INCOHERENTES =
  'La date de fin doit être postérieure ou égale à la date de début';

const champsCampagneSchema = z.object({
  parcelleId: identifiantSchema,
  nom: texteCourtSchema,
  cultureId: identifiantSchema.nullable().optional(),
  culture: z.string().trim().min(1).max(100).nullable().optional(),
  dateDebut: dateCalendaireSchema,
  dateFin: dateCalendaireSchema.nullable().optional(),
});

export const creerCampagneSchema = champsCampagneSchema.refine(datesCampagneCoherentes, {
  message: MESSAGE_DATES_INCOHERENTES,
  path: ['dateFin'],
});

export type CreerCampagne = z.infer<typeof creerCampagneSchema>;

/** La parcelle n'est pas modifiable. La cohérence des dates est vérifiée par l'API après fusion. */
export const modifierCampagneSchema = champsCampagneSchema.omit({ parcelleId: true }).partial();

export type ModifierCampagne = z.infer<typeof modifierCampagneSchema>;

export const filtreCampagnesSchema = z.object({
  parcelleId: identifiantSchema.optional(),
});

export type FiltreCampagnes = z.infer<typeof filtreCampagnesSchema>;
