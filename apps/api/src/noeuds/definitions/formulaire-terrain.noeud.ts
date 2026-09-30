import {
  defineNode,
  libellesSystemesIrrigation,
  libellesTypesSol,
  systemesIrrigation,
  typesSol,
  type FormulaireTerrain,
} from '@workflow/shared';
import { z } from 'zod';

/** Texte saisi → `null` s'il est vide. */
function texteOuNull(texte: string): string | null {
  const nettoye = texte.trim();
  return nettoye === '' ? null : nettoye;
}

const NON_RENSEIGNE = '';

const photoParametreSchema = z.object({
  nom: z.string().trim().min(1).max(255).meta({ title: 'Fichier' }),
  typeMime: z.string().max(100).default('').meta({ title: 'Type', widget: 'masque' }),
  tailleOctets: z.int().min(0).default(0).meta({ title: 'Taille (octets)', widget: 'masque' }),
  modifieeLe: z
    .union([z.literal(''), z.iso.datetime()])
    .default('')
    .meta({ title: 'Date du fichier', widget: 'masque' }),
  latitude: z.number().min(-90).max(90).optional().meta({ title: 'Latitude' }),
  longitude: z.number().min(-180).max(180).optional().meta({ title: 'Longitude' }),
  legende: z.string().max(500).default('').meta({ title: 'Légende' }),
});

/**
 * Formulaire terrain : saisie de la culture, du sol, de l'irrigation, de l'historique
 * et des métadonnées des photos (pas les images). Produit une saisie normalisée,
 * où `null` signifie « non renseigné ».
 */
export const noeudFormulaireTerrain = defineNode({
  id: 'collecte.formulaire_terrain',
  categorie: 'collecte',
  libelle: 'Formulaire terrain',
  description: 'Culture, sol, irrigation, historique et photos (métadonnées) de la parcelle.',
  entrees: {},
  sorties: {
    formulaire: { type: 'formulaire_terrain', libelle: 'Saisie terrain' },
  },
  parametres: z.object({
    culture: z.string().max(100).default('').meta({ title: 'Culture en place' }),
    typeSol: z
      .enum([NON_RENSEIGNE, ...typesSol])
      .default(NON_RENSEIGNE)
      .meta({
        title: 'Type de sol',
        libelles: { [NON_RENSEIGNE]: '— Non renseigné —', ...libellesTypesSol },
      }),
    irrigation: z
      .object({
        statut: z
          .enum(['non_renseigne', 'irriguee', 'non_irriguee'])
          .default('non_renseigne')
          .meta({
            title: 'Irrigation',
            libelles: {
              non_renseigne: '— Non renseigné —',
              irriguee: 'Parcelle irriguée',
              non_irriguee: 'Parcelle non irriguée',
            },
          }),
        systeme: z
          .enum([NON_RENSEIGNE, ...systemesIrrigation])
          .default(NON_RENSEIGNE)
          .meta({
            title: 'Système',
            libelles: { [NON_RENSEIGNE]: '— Non renseigné —', ...libellesSystemesIrrigation },
          }),
        volumeAnnuelM3Ha: z
          .number()
          .min(0)
          .max(10_000)
          .optional()
          .meta({ title: 'Volume annuel (m³/ha)' }),
      })
      .prefault({})
      .meta({ title: 'Irrigation' }),
    historique: z
      .array(
        z.object({
          annee: z
            .int()
            .min(1950)
            .max(2100)
            .default(new Date().getFullYear() - 1)
            .meta({ title: 'Année' }),
          culture: z.string().max(100).default('').meta({ title: 'Culture' }),
          rendementTHa: z.number().min(0).max(200).optional().meta({ title: 'Rendement (t/ha)' }),
        }),
      )
      .max(30)
      .default([])
      .meta({ title: 'Historique cultural' }),
    photos: z.array(photoParametreSchema).max(100).default([]).meta({
      title: 'Photos',
      description: 'Seules les métadonnées sont conservées',
      widget: 'photos',
    }),
    observations: z
      .string()
      .max(5000)
      .default('')
      .meta({ title: 'Observations', widget: 'texte-long' }),
  }),
  run: async ({ params }) => {
    const { irrigation } = params;
    const formulaire: FormulaireTerrain = {
      culture: texteOuNull(params.culture),
      typeSol: params.typeSol === NON_RENSEIGNE ? null : params.typeSol,
      irrigation: {
        irriguee: irrigation.statut === 'non_renseigne' ? null : irrigation.statut === 'irriguee',
        systeme: irrigation.systeme === NON_RENSEIGNE ? null : irrigation.systeme,
        volumeAnnuelM3Ha: irrigation.volumeAnnuelM3Ha ?? null,
      },
      historique: [...params.historique]
        .sort((a, b) => b.annee - a.annee)
        .map((entree) => ({
          annee: entree.annee,
          culture: texteOuNull(entree.culture),
          rendementTHa: entree.rendementTHa ?? null,
        })),
      photos: params.photos.map((photo) => ({
        nom: photo.nom,
        typeMime: photo.typeMime,
        tailleOctets: photo.tailleOctets,
        modifieeLe: photo.modifieeLe === '' ? null : photo.modifieeLe,
        latitude: photo.latitude ?? null,
        longitude: photo.longitude ?? null,
        legende: texteOuNull(photo.legende),
      })),
      observations: texteOuNull(params.observations),
    };
    return { formulaire };
  },
});
