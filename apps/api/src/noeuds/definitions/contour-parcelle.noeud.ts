import { defineNode } from '@workflow/shared';
import { z } from 'zod';

/**
 * Contour d'une parcelle enregistrée sur la plateforme, lu par son identifiant.
 * Pensé pour les exécutions par lot : le paramètre référence la variable `${parcelleId}`,
 * remplie pour chaque parcelle du lot (ou avec la parcelle de la campagne exécutée).
 */
export const noeudContourParcelle = defineNode({
  id: 'collecte.contour_parcelle',
  categorie: 'collecte',
  libelle: 'Contour de parcelle',
  description:
    'Contour d’une parcelle déjà enregistrée (WGS 84), choisi par son identifiant : idéal avec la variable ${parcelleId} pour les lots.',
  entrees: {},
  sorties: {
    geometrie: { type: 'geometrie', libelle: 'Contour' },
  },
  parametres: z.object({
    parcelleId: z.string().trim().max(100).default('').meta({
      title: 'Parcelle (identifiant)',
      description: 'En général lié à la variable ${parcelleId} du workflow',
    }),
  }),
  run: async ({ params, context }) => {
    if (params.parcelleId === '') {
      throw new Error(
        'Aucune parcelle indiquée : liez le paramètre à la variable ${parcelleId} du workflow',
      );
    }
    if (!context.ressources) {
      throw new Error('Lecture des parcelles indisponible hors de la plateforme');
    }
    const parcelle = await context.ressources.lireParcelle({ id: params.parcelleId });
    if (!parcelle) {
      throw new Error(`Parcelle introuvable : ${params.parcelleId}`);
    }
    return { geometrie: { crs: 'EPSG:4326', geometrie: parcelle.geometrie } };
  },
});
