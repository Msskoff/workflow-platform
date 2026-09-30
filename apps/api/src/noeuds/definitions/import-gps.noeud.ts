import { codeCrsSchema, defineNode, libellesCrs } from '@workflow/shared';
import { z } from 'zod';
import { construireContour } from '../../geo/construction-contour';
import { lireFichierGps } from '../../geo/lecture-gps';

/**
 * Import GPS : lit un fichier GeoJSON (points, trace ou polygone) ou CSV de points
 * et produit le contour de la parcelle dans le système de coordonnées du fichier.
 */
export const noeudImportGps = defineNode({
  id: 'collecte.import_gps',
  categorie: 'collecte',
  libelle: 'Import GPS',
  description: 'Lit un GeoJSON ou un CSV de points GPS et produit le contour de la parcelle.',
  entrees: {},
  sorties: {
    geometrie: { type: 'geometrie', libelle: 'Contour' },
    nombrePoints: { type: 'nombre', libelle: 'Points lus' },
  },
  parametres: z.object({
    contenu: z.string().max(2_000_000).default('').meta({
      title: 'Fichier GPS',
      description: 'GeoJSON (points, trace ou polygone) ou CSV avec ligne d’en-tête',
      widget: 'fichier-texte',
      accept: '.geojson,.json,.csv,.txt',
      champNomFichier: 'nomFichier',
    }),
    nomFichier: z.string().max(255).default('').meta({ title: 'Nom du fichier', widget: 'masque' }),
    format: z
      .enum(['auto', 'geojson', 'csv'])
      .default('auto')
      .meta({
        title: 'Format',
        libelles: { auto: 'Détection automatique', geojson: 'GeoJSON', csv: 'CSV' },
      }),
    methode: z
      .enum(['trace', 'enveloppe_convexe'])
      .default('trace')
      .meta({
        title: 'Construction du contour',
        description: 'Ignoré si le fichier contient déjà un polygone',
        libelles: {
          trace: 'Tour de parcelle (points dans l’ordre)',
          enveloppe_convexe: 'Enveloppe convexe (points dans le désordre)',
        },
      }),
    crsSource: codeCrsSchema
      .default('EPSG:4326')
      .meta({ title: 'Système de coordonnées du fichier', libelles: libellesCrs }),
    colonneX: z
      .string()
      .max(100)
      .default('')
      .meta({ title: 'Colonne X / longitude (CSV)', description: 'Vide : détection automatique' }),
    colonneY: z
      .string()
      .max(100)
      .default('')
      .meta({ title: 'Colonne Y / latitude (CSV)', description: 'Vide : détection automatique' }),
  }),
  run: async ({ params }) => {
    const lecture = lireFichierGps({
      contenu: params.contenu,
      format: params.format,
      colonneX: params.colonneX,
      colonneY: params.colonneY,
    });

    if (lecture.nature === 'contour') {
      const anneaux =
        lecture.geometrie.type === 'Polygon'
          ? lecture.geometrie.coordinates
          : lecture.geometrie.coordinates.flat();
      return {
        geometrie: { crs: params.crsSource, geometrie: lecture.geometrie },
        nombrePoints: anneaux.reduce((total, anneau) => total + anneau.length, 0),
      };
    }

    return {
      geometrie: {
        crs: params.crsSource,
        geometrie: construireContour({ points: lecture.points, methode: params.methode }),
      },
      nombrePoints: lecture.points.length,
    };
  },
});
