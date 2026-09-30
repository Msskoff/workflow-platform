import { defineNode } from '@workflow/shared';
import { z } from 'zod';
import { calculerDevis } from '../../analyse/devis';

/**
 * Devis indicatif des services pour la parcelle : surface × tarif à l'hectare de chaque
 * service actif, plus frais fixes et TVA. Aucune facturation n'est gérée ici.
 */
export const noeudDevis = defineNode({
  id: 'restitution.devis',
  categorie: 'restitution',
  libelle: 'Devis',
  description: 'Estime le coût des services : surface × tarif à l’hectare, frais fixes et TVA.',
  entrees: {
    surfaceHa: { type: 'nombre', libelle: 'Surface (ha)' },
  },
  sorties: {
    devis: { type: 'devis', libelle: 'Devis' },
    totalTtc: { type: 'nombre', libelle: 'Total TTC (€)' },
  },
  parametres: z.object({
    services: z
      .array(
        z.object({
          libelle: z
            .string()
            .trim()
            .min(1)
            .max(120)
            .default('Nouveau service')
            .meta({ title: 'Service' }),
          tarifHtParHa: z.number().min(0).max(10_000).default(0).meta({ title: 'Tarif HT (€/ha)' }),
          actif: z.boolean().default(true).meta({ title: 'Inclus dans le devis' }),
        }),
      )
      .max(30)
      .default([
        { libelle: 'Cartographie de vigueur (NDVI)', tarifHtParHa: 9, actif: true },
        { libelle: 'Zonage et préconisation de modulation', tarifHtParHa: 14, actif: true },
        { libelle: 'Suivi de saison (4 passages satellite)', tarifHtParHa: 18, actif: false },
      ])
      .meta({ title: 'Services et tarifs' }),
    fraisFixesHt: z.number().min(0).max(100_000).default(50).meta({ title: 'Frais fixes HT (€)' }),
    surfaceMinimaleHa: z
      .number()
      .min(0)
      .max(1000)
      .default(5)
      .meta({ title: 'Surface minimale facturée (ha)' }),
    tauxTvaPourcent: z.number().min(0).max(100).default(20).meta({ title: 'TVA (%)' }),
  }),
  run: async ({ inputs, params }) => {
    const devis = calculerDevis({
      surfaceHa: inputs.surfaceHa,
      services: params.services,
      fraisFixesHt: params.fraisFixesHt,
      tauxTvaPourcent: params.tauxTvaPourcent,
      surfaceMinimaleHa: params.surfaceMinimaleHa,
    });
    return { devis, totalTtc: devis.totalTtc };
  },
});
