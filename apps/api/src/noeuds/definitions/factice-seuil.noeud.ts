import { defineNode } from '@workflow/shared';
import { z } from 'zod';
import { attendre } from '../../common/attendre';

/**
 * Nœud de démonstration : compare une valeur à un seuil.
 * Une valeur négative provoque une erreur, pour démontrer le statut `erreur`.
 */
export const noeudFacticeSeuil = defineNode({
  id: 'factice.seuil',
  categorie: 'decision',
  libelle: 'Seuil (factice)',
  description: 'Indique si la valeur dépasse le seuil. Échoue si la valeur est négative.',
  entrees: {
    valeur: { type: 'nombre', libelle: 'Valeur' },
  },
  sorties: {
    depasse: { type: 'booleen', libelle: 'Seuil dépassé' },
    message: { type: 'texte', libelle: 'Message' },
  },
  parametres: z.object({
    seuil: z.number().default(10).meta({ title: 'Seuil' }),
    dureeMs: z.int().min(0).max(5000).default(800).meta({ title: 'Durée simulée (ms)' }),
  }),
  run: async ({ inputs, params }) => {
    await attendre({ ms: params.dureeMs });
    if (inputs.valeur < 0) {
      throw new Error(`Valeur négative (${inputs.valeur}) : mesure invalide`);
    }
    const depasse = inputs.valeur > params.seuil;
    return {
      depasse,
      message: `${inputs.valeur} ${depasse ? '>' : '≤'} seuil ${params.seuil}`,
    };
  },
});
