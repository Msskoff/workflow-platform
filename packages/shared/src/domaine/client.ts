import { z } from 'zod';
import { horodatageSchema, identifiantSchema, texteCourtSchema } from './commun';

/** Client de l'entreprise (exploitant agricole). */
export const clientSchema = z.object({
  id: identifiantSchema,
  nom: texteCourtSchema,
  email: z.email().nullable(),
  telephone: z.string().nullable(),
  /** Un lien d'accès à l'espace client a été généré (le jeton n'est jamais renvoyé). */
  accesActif: z.boolean(),
  creeLe: horodatageSchema,
  modifieLe: horodatageSchema,
});

export type Client = z.infer<typeof clientSchema>;

export const creerClientSchema = z.object({
  nom: texteCourtSchema,
  email: z.email().nullable().optional(),
  telephone: z.string().trim().min(1).max(30).nullable().optional(),
});

export type CreerClient = z.infer<typeof creerClientSchema>;

export const modifierClientSchema = creerClientSchema.partial();

export type ModifierClient = z.infer<typeof modifierClientSchema>;

export const filtreClientsSchema = z.object({
  /** Recherche partielle sur le nom. */
  nom: z.string().trim().min(1).optional(),
});

export type FiltreClients = z.infer<typeof filtreClientsSchema>;
