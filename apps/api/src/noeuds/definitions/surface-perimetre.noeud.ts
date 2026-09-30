import {
  calculerPerimetreM,
  calculerSurfaceHa,
  defineNode,
  geometrieParcelleSchema,
  indicateursDuCatalogue,
} from '@workflow/shared';
import { z } from 'zod';
import { reprojeter } from '../../geo/projections';

/**
 * Surface et périmètre d'une parcelle, calculés sur l'ellipsoïde approché par une sphère
 * (quel que soit le système de coordonnées d'entrée), et indice de compacité 4πA/P².
 */
export const noeudSurfacePerimetre = defineNode({
  id: 'analyse.surface_perimetre',
  categorie: 'analyse',
  libelle: 'Surface et périmètre',
  description: 'Calcule la surface (ha), le périmètre (m) et la compacité de la parcelle.',
  entrees: {
    geometrie: { type: 'geometrie', libelle: 'Géométrie' },
  },
  sorties: {
    surfaceHa: { type: 'nombre', libelle: 'Surface (ha)' },
    perimetreM: { type: 'nombre', libelle: 'Périmètre (m)' },
    indicateurs: {
      type: 'indicateurs',
      libelle: 'Indicateurs',
      indicateurs: indicateursDuCatalogue({ cles: ['surfaceHa', 'perimetreM', 'indiceCompacite'] }),
    },
  },
  parametres: z.object({}),
  run: async ({ inputs }) => {
    const wgs84 = geometrieParcelleSchema.safeParse(
      reprojeter({ source: inputs.geometrie, vers: 'EPSG:4326' }).geometrie,
    );
    if (!wgs84.success) {
      throw new Error(
        'Géométrie invalide (anneau non fermé ou coordonnées impossibles) : placez un contrôle qualité en amont',
      );
    }
    const surfaceHa = calculerSurfaceHa({ geometrie: wgs84.data });
    const perimetreM = calculerPerimetreM({ geometrie: wgs84.data });
    const indiceCompacite =
      perimetreM > 0
        ? Math.round(((4 * Math.PI * surfaceHa * 10_000) / perimetreM ** 2) * 1000) / 1000
        : 0;

    return {
      surfaceHa,
      perimetreM,
      indicateurs: { surfaceHa, perimetreM, indiceCompacite },
    };
  },
});
