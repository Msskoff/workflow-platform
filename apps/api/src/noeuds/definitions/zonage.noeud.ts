import { defineNode, indicateursDuCatalogue } from '@workflow/shared';
import { z } from 'zod';
import { zoner } from '../../analyse/zonage';

/** Découpage de la parcelle en zones de vigueur homogène à partir du NDVI. */
export const noeudZonage = defineNode({
  id: 'analyse.zonage',
  categorie: 'analyse',
  libelle: 'Zonage',
  description: 'Découpe la parcelle en zones de NDVI homogène (zone 1 = la plus faible).',
  entrees: {
    raster: { type: 'raster_ndvi', libelle: 'NDVI par pixel' },
  },
  sorties: {
    zonage: { type: 'zonage', libelle: 'Zones' },
    indicateurs: {
      type: 'indicateurs',
      libelle: 'Indicateurs',
      indicateurs: indicateursDuCatalogue({
        cles: [
          'nombreZones',
          'heterogeneiteNdviPourcent',
          'ecartNdviZones',
          'partZoneFaiblePourcent',
        ],
      }),
    },
  },
  parametres: z.object({
    nombreZones: z.int().min(2).max(7).default(3).meta({ title: 'Nombre de zones' }),
    methode: z
      .enum(['kmeans', 'quantiles'])
      .default('kmeans')
      .meta({
        title: 'Méthode',
        libelles: {
          kmeans: 'Classes naturelles (k-means)',
          quantiles: 'Surfaces égales (quantiles)',
        },
      }),
  }),
  run: async ({ inputs, params }) => {
    const zonage = zoner({
      raster: inputs.raster,
      nombreZones: params.nombreZones,
      methode: params.methode,
    });

    const valides = inputs.raster.valeurs.filter((valeur): valeur is number => valeur !== null);
    const moyenne = valides.reduce((somme, valeur) => somme + valeur, 0) / valides.length;
    const ecartType = Math.sqrt(
      valides.reduce((somme, valeur) => somme + (valeur - moyenne) ** 2, 0) / valides.length,
    );
    const moyennesZones = zonage.zones.map((zone) => zone.ndviMoyen);

    return {
      zonage,
      indicateurs: {
        nombreZones: zonage.zones.length,
        heterogeneiteNdviPourcent: moyenne > 0 ? Math.round((ecartType / moyenne) * 1000) / 10 : 0,
        ecartNdviZones:
          Math.round((Math.max(...moyennesZones) - Math.min(...moyennesZones)) * 1000) / 1000,
        partZoneFaiblePourcent: zonage.zones[0]?.partSurface ?? 0,
      },
    };
  },
});
