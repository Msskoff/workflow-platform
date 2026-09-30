import { codeCrsSchema, defineNode, libellesCrs } from '@workflow/shared';
import { z } from 'zod';
import { reprojeter } from '../../geo/projections';

/** Reprojection d'une géométrie vers le système de coordonnées choisi. */
export const noeudReprojection = defineNode({
  id: 'standardisation.reprojection',
  categorie: 'standardisation',
  libelle: 'Reprojection',
  description: 'Convertit une géométrie vers un autre système de coordonnées (Lambert-93, UTM…).',
  entrees: {
    geometrie: { type: 'geometrie', libelle: 'Géométrie' },
  },
  sorties: {
    geometrie: { type: 'geometrie', libelle: 'Géométrie reprojetée' },
  },
  parametres: z.object({
    crsCible: codeCrsSchema
      .default('EPSG:2154')
      .meta({ title: 'Système de coordonnées cible', libelles: libellesCrs }),
  }),
  run: async ({ inputs, params }) => ({
    geometrie: reprojeter({ source: inputs.geometrie, vers: params.crsCible }),
  }),
});
