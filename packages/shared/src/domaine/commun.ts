import { z } from 'zod';

/** Identifiant d'entité (cuid généré par la base). */
export const identifiantSchema = z.string().trim().min(1);

/** Horodatage ISO 8601 UTC, format de transport des dates. */
export const horodatageSchema = z.iso.datetime();

/** Date calendaire `AAAA-MM-JJ`, sans fuseau horaire. */
export const dateCalendaireSchema = z.iso.date();

/** Libellé court saisi par l'utilisateur (nom, source…). */
export const texteCourtSchema = z.string().trim().min(1).max(200);

/** Machine à états : pour chaque statut, les statuts atteignables directement. */
export type Transitions<Statut extends string> = Readonly<Record<Statut, readonly Statut[]>>;

interface PeutTransitionnerParams<Statut extends string> {
  transitions: Transitions<Statut>;
  depuis: Statut;
  vers: Statut;
}

/** Indique si le passage `depuis → vers` est autorisé par la machine à états. */
export function peutTransitionner<Statut extends string>({
  transitions,
  depuis,
  vers,
}: PeutTransitionnerParams<Statut>): boolean {
  return transitions[depuis].includes(vers);
}
