import { z } from 'zod';
import { doseReferenceSchema } from './culture';
import { regleMetierSchema } from './regles';
import type { GrapheWorkflow, NoeudWorkflow } from './workflow-snapshot';

/**
 * Paramètres par défaut qu'un modèle de workflow rattaché à une culture expose :
 * seuils NDVI des règles, doses de référence des interventions, tarifs du devis.
 * Ils sont appliqués au graphe du modèle (`appliquerParametresCulture`), qui reste
 * la seule source exécutée.
 */
export const parametresCultureSchema = z.object({
  seuilsNdvi: z.object({
    /** NDVI moyen sous lequel la vigueur est « à surveiller » au stade analysé. */
    vigueurASurveiller: z.number().min(0).max(1),
    /** Coefficient de variation du NDVI (%) au-delà duquel la parcelle est hétérogène. */
    heterogeneitePourcent: z.number().min(0).max(100),
    /** Part de la zone faible (%) au-delà de laquelle un diagnostic terrain s'impose. */
    partZoneFaiblePourcent: z.number().min(0).max(100),
  }),
  /** Doses de référence, rattachées aux interventions types de la culture par leur code. */
  dosesReference: z.array(doseReferenceSchema).max(30),
  /** Tarifs HT du devis, en euros. */
  tarifs: z.object({
    cartographieNdviParHa: z.number().min(0).max(10_000),
    zonageParHa: z.number().min(0).max(10_000),
    suiviSaisonParHa: z.number().min(0).max(10_000),
    fraisFixes: z.number().min(0).max(100_000),
  }),
  /** Valeurs indicatives, à valider par un agronome avant usage en conseil. */
  aValider: z.boolean(),
});

export type ParametresCulture = z.infer<typeof parametresCultureSchema>;

export const TYPE_NOEUD_REGLES = 'decision.regles_metier';
export const TYPE_NOEUD_DEVIS = 'restitution.devis';

/** Seuil de règle piloté par chaque indicateur. */
const SEUILS_PAR_INDICATEUR: Readonly<
  Record<string, (seuils: ParametresCulture['seuilsNdvi']) => number>
> = {
  ndviMoyen: (seuils) => seuils.vigueurASurveiller,
  heterogeneiteNdviPourcent: (seuils) => seuils.heterogeneitePourcent,
  partZoneFaiblePourcent: (seuils) => seuils.partZoneFaiblePourcent,
};

/** Libellés des services du devis, dans l'ordre du nœud Devis. */
export const SERVICES_DEVIS = {
  cartographie: 'Cartographie de vigueur (NDVI)',
  zonage: 'Zonage et préconisation de modulation',
  suivi: 'Suivi de saison (4 passages satellite)',
} as const;

const servicesDevisSchema = z.array(
  z.object({ libelle: z.string(), tarifHtParHa: z.number(), actif: z.boolean() }),
);

type ServiceDevis = z.infer<typeof servicesDevisSchema>[number];

/** Règles et services sont des objets JSON simples : ils restent des paramètres de nœud valides. */
function versParametres({
  valeurs,
}: {
  valeurs: Record<string, unknown>;
}): NoeudWorkflow['parametres'] {
  return valeurs as NoeudWorkflow['parametres'];
}

/**
 * Applique les paramètres d'une culture au graphe d'un modèle, sans le muter :
 * - nœuds Règles métier : seuil des règles portant sur `ndviMoyen`,
 *   `heterogeneiteNdviPourcent` et `partZoneFaiblePourcent` ;
 * - nœuds Devis : tarifs des trois services standard (inclusion conservée) et frais fixes.
 * Les autres nœuds et paramètres sont laissés tels quels.
 */
export function appliquerParametresCulture({
  graphe,
  parametres,
}: {
  graphe: GrapheWorkflow;
  parametres: ParametresCulture;
}): GrapheWorkflow {
  return {
    ...graphe,
    noeuds: graphe.noeuds.map((noeud) => {
      if (noeud.type === TYPE_NOEUD_REGLES) {
        const regles = z.array(regleMetierSchema).safeParse(noeud.parametres.regles);
        if (!regles.success) {
          return noeud;
        }
        return {
          ...noeud,
          parametres: versParametres({
            valeurs: {
              ...noeud.parametres,
              regles: regles.data.map((regle) => {
                const seuil = SEUILS_PAR_INDICATEUR[regle.indicateur];
                return seuil ? { ...regle, seuil: seuil(parametres.seuilsNdvi) } : regle;
              }),
            },
          }),
        };
      }
      if (noeud.type === TYPE_NOEUD_DEVIS) {
        const existants = servicesDevisSchema.safeParse(noeud.parametres.services).data ?? [];
        const actif = ({ libelle, parDefaut }: { libelle: string; parDefaut: boolean }) =>
          existants.find((service) => service.libelle === libelle)?.actif ?? parDefaut;
        const { tarifs } = parametres;
        const standard: ServiceDevis[] = [
          {
            libelle: SERVICES_DEVIS.cartographie,
            tarifHtParHa: tarifs.cartographieNdviParHa,
            actif: actif({ libelle: SERVICES_DEVIS.cartographie, parDefaut: true }),
          },
          {
            libelle: SERVICES_DEVIS.zonage,
            tarifHtParHa: tarifs.zonageParHa,
            actif: actif({ libelle: SERVICES_DEVIS.zonage, parDefaut: true }),
          },
          {
            libelle: SERVICES_DEVIS.suivi,
            tarifHtParHa: tarifs.suiviSaisonParHa,
            actif: actif({ libelle: SERVICES_DEVIS.suivi, parDefaut: false }),
          },
        ];
        const libellesStandard: readonly string[] = Object.values(SERVICES_DEVIS);
        return {
          ...noeud,
          parametres: versParametres({
            valeurs: {
              ...noeud.parametres,
              services: [
                ...standard,
                ...existants.filter((service) => !libellesStandard.includes(service.libelle)),
              ],
              fraisFixesHt: tarifs.fraisFixes,
            },
          }),
        };
      }
      return noeud;
    }),
  };
}
