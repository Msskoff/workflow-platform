import type { z } from 'zod';

export type ResultatLecture<Donnees> =
  { ok: true; donnees: Donnees } | { ok: false; erreur: string };

interface LireApiServeurParams<Schema extends z.ZodType> {
  /** Chemin de la route, ex. `/campagnes`. */
  chemin: string;
  /** Schéma partagé qui valide la réponse. */
  schema: Schema;
}

/** Lecture de l'API depuis un composant serveur, réponse validée par un schéma partagé. */
export async function lireApiServeur<Schema extends z.ZodType>({
  chemin,
  schema,
}: LireApiServeurParams<Schema>): Promise<ResultatLecture<z.output<Schema>>> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  try {
    const reponse = await fetch(`${apiUrl}${chemin}`, { cache: 'no-store' });
    if (!reponse.ok) {
      return { ok: false, erreur: `${chemin} : HTTP ${reponse.status}` };
    }
    const resultat = schema.safeParse(await reponse.json());
    if (!resultat.success) {
      return { ok: false, erreur: `${chemin} : réponse non conforme au schéma partagé` };
    }
    return { ok: true, donnees: resultat.data };
  } catch (erreur) {
    return {
      ok: false,
      erreur: `API injoignable (${apiUrl}) : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
    };
  }
}
