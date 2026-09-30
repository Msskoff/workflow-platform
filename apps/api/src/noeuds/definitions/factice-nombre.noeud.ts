import { defineNode } from '@workflow/shared';
import { z } from 'zod';
import { attendre } from '../../common/attendre';

/** Nœud de démonstration : émet un nombre fixe après une durée simulée. */
export const noeudFacticeNombre = defineNode({
  id: 'factice.nombre',
  categorie: 'collecte',
  libelle: 'Nombre (factice)',
  description: 'Émet un nombre fixe. Sert à démontrer le moteur.',
  entrees: {},
  sorties: {
    nombre: { type: 'nombre', libelle: 'Nombre' },
  },
  parametres: z.object({
    valeur: z.number().default(42).meta({ title: 'Valeur' }),
    dureeMs: z.int().min(0).max(5000).default(800).meta({ title: 'Durée simulée (ms)' }),
  }),
  run: async ({ params }) => {
    await attendre({ ms: params.dureeMs });
    return { nombre: params.valeur };
  },
});
