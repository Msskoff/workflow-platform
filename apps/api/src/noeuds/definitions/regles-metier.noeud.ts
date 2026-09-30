import {
  catalogueIndicateurs,
  defineNode,
  regleMetierSchema,
  type RegleMetier,
} from '@workflow/shared';
import { z } from 'zod';
import { evaluerRegles } from '../../analyse/regles';

/** Règles proposées à la création du nœud, à adapter ou supprimer. */
const REGLES_EXEMPLES: RegleMetier[] = [
  {
    id: 'vigueur-faible',
    nom: 'Vigueur faible',
    active: true,
    indicateur: 'ndviMoyen',
    operateur: '<',
    seuil: 0.5,
    recommandation:
      'Programmer un tour de plaine pour diagnostiquer la parcelle (levée, carences, dégâts).',
    explication:
      'Le NDVI moyen de la parcelle ({valeur}) est inférieur à {seuil}, signe d’une végétation peu vigoureuse.',
    priorite: 'haute',
  },
  {
    id: 'parcelle-heterogene',
    nom: 'Parcelle hétérogène',
    active: true,
    indicateur: 'heterogeneiteNdviPourcent',
    operateur: '>',
    seuil: 15,
    recommandation: 'Moduler la fertilisation azotée selon les zones de vigueur.',
    explication:
      'L’hétérogénéité du NDVI ({valeur} %) dépasse {seuil} %, une modulation intra-parcellaire est donc justifiée.',
    priorite: 'normale',
  },
];

const libellesIndicateurs: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(catalogueIndicateurs).map(([cle, { libelle }]) => [cle, libelle.toLowerCase()]),
);

/**
 * Règles métier explicites : chaque règle active compare un indicateur à un seuil.
 * Une règle déclenchée produit une décision proposée (recommandation, explication, motif) ;
 * à la fin d'une exécution réussie, elle est enregistrée comme Décision en brouillon.
 */
export const noeudReglesMetier = defineNode({
  id: 'decision.regles_metier',
  categorie: 'decision',
  libelle: 'Règles métier',
  description: 'Compare les indicateurs à des seuils et produit des décisions expliquées.',
  entrees: {
    indicateurs: { type: 'indicateurs', libelle: 'Indicateurs', multiple: true },
  },
  sorties: {
    decisions: { type: 'decisions', libelle: 'Décisions' },
    nombreDecisions: { type: 'nombre', libelle: 'Règles déclenchées' },
  },
  parametres: z.object({
    regles: z
      .array(regleMetierSchema)
      .max(50)
      .refine((regles) => new Set(regles.map((regle) => regle.id)).size === regles.length, {
        message: 'Deux règles ont le même identifiant',
      })
      .default(REGLES_EXEMPLES)
      .meta({ title: 'Règles', widget: 'regles' }),
  }),
  run: async ({ inputs, params }) => {
    // Fusion des indicateurs reçus ; à clé égale, la dernière connexion l'emporte.
    const indicateurs = Object.assign({}, ...inputs.indicateurs);
    const decisions = evaluerRegles({
      regles: params.regles,
      indicateurs,
      libelles: libellesIndicateurs,
    });
    return { decisions, nombreDecisions: decisions.declenchees.length };
  },
});
