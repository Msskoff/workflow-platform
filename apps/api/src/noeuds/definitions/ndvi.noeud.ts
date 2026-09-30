import { codesCrs, defineNode, indicateursDuCatalogue, libellesCrs } from '@workflow/shared';
import { z } from 'zod';
import { calculerNdvi } from '../../analyse/ndvi';
import { lireGeoTiff } from '../../raster/lecture-geotiff';

const AUTO = 'auto';

/**
 * NDVI d'une image satellite fournie en GeoTIFF (ex. Sentinel-2 B04/B08 découpée sur la
 * parcelle). Si la géométrie est connectée, seuls les pixels de la parcelle sont gardés.
 */
export const noeudNdvi = defineNode({
  id: 'analyse.ndvi',
  categorie: 'analyse',
  libelle: 'NDVI',
  description: 'Indice de végétation (PIR − Rouge) / (PIR + Rouge) d’une image GeoTIFF.',
  entrees: {
    geometrie: { type: 'geometrie', libelle: 'Parcelle (masque)', optionnel: true },
  },
  sorties: {
    raster: { type: 'raster_ndvi', libelle: 'NDVI par pixel' },
    ndviMoyen: { type: 'nombre', libelle: 'NDVI moyen' },
    indicateurs: {
      type: 'indicateurs',
      libelle: 'Indicateurs',
      indicateurs: indicateursDuCatalogue({
        cles: [
          'ndviMoyen',
          'ndviMin',
          'ndviMax',
          'ndviEcartType',
          'pixelsValides',
          'surfaceCouverteHa',
        ],
      }),
    },
  },
  parametres: z.object({
    image: z.string().max(7_000_000).default('').meta({
      title: 'Image satellite (GeoTIFF)',
      description: 'Bandes rouge et proche infrarouge, découpée sur la parcelle (5 Mo max)',
      widget: 'fichier-binaire',
      accept: '.tif,.tiff',
      champNomFichier: 'nomFichier',
    }),
    nomFichier: z.string().max(255).default('').meta({ title: 'Nom du fichier', widget: 'masque' }),
    bandeRouge: z
      .int()
      .min(1)
      .max(20)
      .default(1)
      .meta({ title: 'Bande rouge (n°)', description: 'Sentinel-2 : B04' }),
    bandePir: z
      .int()
      .min(1)
      .max(20)
      .default(2)
      .meta({ title: 'Bande proche infrarouge (n°)', description: 'Sentinel-2 : B08' }),
    decalage: z.number().min(-10_000).max(10_000).default(0).meta({
      title: 'Décalage radiométrique',
      description: 'Ajouté aux valeurs brutes. Sentinel-2 L2A traité depuis 2022 : −1000',
    }),
    crsImage: z
      .enum([AUTO, ...codesCrs])
      .default(AUTO)
      .meta({
        title: 'Système de coordonnées de l’image',
        libelles: { [AUTO]: 'Lu dans le fichier', ...libellesCrs },
      }),
  }),
  run: async ({ inputs, params }) => {
    const image = await lireGeoTiff({
      base64: params.image,
      crsForce: params.crsImage === AUTO ? null : params.crsImage,
    });
    const { raster, statistiques } = calculerNdvi({
      image,
      bandeRouge: params.bandeRouge,
      bandePir: params.bandePir,
      decalage: params.decalage,
      masque: inputs.geometrie ?? null,
    });
    return { raster, ndviMoyen: statistiques.ndviMoyen, indicateurs: { ...statistiques } };
  },
});
