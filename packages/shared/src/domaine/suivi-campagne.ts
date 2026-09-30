import { z } from 'zod';
import { dateCalendaireSchema, horodatageSchema, identifiantSchema } from './commun';
import { decisionSchema, statutsVisiblesClient, type Decision } from './decision';

/**
 * Suivi de campagne : ce qui a été conseillé, appliqué, et ce qui reste à faire.
 * Seules les décisions envoyées au client comptent comme « conseillées ».
 */

export const indicateursSuiviSchema = z.object({
  /** Décisions envoyées au client (faites ou non). */
  conseillees: z.int().nonnegative(),
  appliquees: z.int().nonnegative(),
  nonAppliquees: z.int().nonnegative(),
  /** Envoyées, ni appliquées ni déclarées non appliquées. */
  aFaire: z.int().nonnegative(),
  /** Décisions pas encore envoyées (brouillon ou validées). */
  enPreparation: z.int().nonnegative(),
  /** Appliquées / conseillées, en %. `null` si rien n'a été conseillé. */
  tauxApplicationPourcent: z.number().nullable(),
  /** Sommes sur les décisions appliquées ayant un coût prévu ET un coût réel. */
  coutPrevu: z.number().nullable(),
  coutReel: z.number().nullable(),
  /** (réel − prévu) / prévu, en %. */
  ecartCoutPourcent: z.number().nullable(),
  decisionsComparablesCout: z.int().nonnegative(),
  /** Moyenne des écarts de dose (réel − prévu) / prévu, en %, à unité identique. */
  ecartDoseMoyenPourcent: z.number().nullable(),
  decisionsComparablesDose: z.int().nonnegative(),
});

export type IndicateursSuivi = z.infer<typeof indicateursSuiviSchema>;

/** Écart relatif `(reel − prevu) / prevu` en %, arrondi à 0,1 ; `null` si le prévu est nul. */
export function ecartPourcent({ prevu, reel }: { prevu: number; reel: number }): number | null {
  if (prevu === 0) {
    return null;
  }
  return Math.round(((reel - prevu) / prevu) * 1000) / 10;
}

/** Écarts prévu/réel d'une décision appliquée : coût en euros, dose en %. */
export function ecartsDecision({ decision }: { decision: Decision }): {
  coutEuros: number | null;
  dosePourcent: number | null;
} {
  const { prevu, reel } = decision;
  if (decision.statut !== 'appliqué' || !reel) {
    return { coutEuros: null, dosePourcent: null };
  }
  const coutEuros =
    prevu.coutEstime !== null && reel.cout !== null
      ? Math.round((reel.cout - prevu.coutEstime) * 100) / 100
      : null;
  const memeUnite = (reel.uniteDose ?? prevu.uniteDose) === prevu.uniteDose;
  const dosePourcent =
    prevu.dose !== null && reel.dose !== null && memeUnite
      ? ecartPourcent({ prevu: prevu.dose, reel: reel.dose })
      : null;
  return { coutEuros, dosePourcent };
}

/** Indicateurs d'une campagne à partir de toutes ses décisions (hors rejetées). */
export function calculerIndicateursSuivi({
  decisions,
}: {
  decisions: readonly Decision[];
}): IndicateursSuivi {
  const visibles: readonly string[] = statutsVisiblesClient;
  const conseillees = decisions.filter((decision) => visibles.includes(decision.statut));
  const appliquees = conseillees.filter((decision) => decision.statut === 'appliqué');
  const nonAppliquees = conseillees.filter((decision) => decision.statut === 'non_appliqué');

  const comparablesCout = appliquees.filter(
    (decision) => decision.prevu.coutEstime !== null && decision.reel?.cout != null,
  );
  const coutPrevu = comparablesCout.reduce(
    (total, decision) => total + (decision.prevu.coutEstime ?? 0),
    0,
  );
  const coutReel = comparablesCout.reduce(
    (total, decision) => total + (decision.reel?.cout ?? 0),
    0,
  );

  const ecartsDose = appliquees
    .map((decision) => ecartsDecision({ decision }).dosePourcent)
    .filter((ecart): ecart is number => ecart !== null);

  const arrondi = (valeur: number) => Math.round(valeur * 10) / 10;
  return {
    conseillees: conseillees.length,
    appliquees: appliquees.length,
    nonAppliquees: nonAppliquees.length,
    aFaire: conseillees.length - appliquees.length - nonAppliquees.length,
    enPreparation: decisions.filter(
      (decision) => decision.statut === 'brouillon' || decision.statut === 'validé',
    ).length,
    tauxApplicationPourcent:
      conseillees.length === 0 ? null : arrondi((appliquees.length / conseillees.length) * 100),
    coutPrevu: comparablesCout.length === 0 ? null : arrondi(coutPrevu),
    coutReel: comparablesCout.length === 0 ? null : arrondi(coutReel),
    ecartCoutPourcent:
      comparablesCout.length === 0 ? null : ecartPourcent({ prevu: coutPrevu, reel: coutReel }),
    decisionsComparablesCout: comparablesCout.length,
    ecartDoseMoyenPourcent:
      ecartsDose.length === 0
        ? null
        : arrondi(ecartsDose.reduce((total, ecart) => total + ecart, 0) / ecartsDose.length),
    decisionsComparablesDose: ecartsDose.length,
  };
}

const contexteCampagneSchema = z.object({
  client: z.object({ id: identifiantSchema, nom: z.string() }),
  parcelle: z.object({ id: identifiantSchema, nom: z.string(), surfaceHa: z.number() }),
  campagne: z.object({
    id: identifiantSchema,
    nom: z.string(),
    culture: z.string().nullable(),
    dateDebut: dateCalendaireSchema,
    dateFin: dateCalendaireSchema.nullable(),
  }),
});

/** Ligne de la liste des campagnes suivies. */
export const resumeSuiviCampagneSchema = contexteCampagneSchema.extend({
  indicateurs: indicateursSuiviSchema,
});

export type ResumeSuiviCampagne = z.infer<typeof resumeSuiviCampagneSchema>;

/** Décision de la campagne avec l'analyse qui l'a produite. */
export const decisionSuiviSchema = z.object({
  decision: decisionSchema,
  analyse: z.object({
    id: identifiantSchema,
    version: z.int().positive(),
    termineeLe: horodatageSchema.nullable(),
  }),
});

export type DecisionSuivi = z.infer<typeof decisionSuiviSchema>;

/** Détail du suivi d'une campagne (décisions rejetées exclues). */
export const suiviCampagneSchema = contexteCampagneSchema.extend({
  indicateurs: indicateursSuiviSchema,
  decisions: z.array(decisionSuiviSchema),
});

export type SuiviCampagne = z.infer<typeof suiviCampagneSchema>;
