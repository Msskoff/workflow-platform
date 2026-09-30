import { couleurNdviRvb, couleurZoneRvb, enCss } from '@workflow/shared';

/** Couleur CSS d'une valeur NDVI (même palette que le rapport PDF). */
export function couleurNdvi({ ndvi }: { ndvi: number }): string {
  return enCss({ rvb: couleurNdviRvb({ ndvi }) });
}

/** Couleur CSS d'une zone : de la plus faible (orange) à la plus vigoureuse (vert foncé). */
export function couleurZone({ numero, total }: { numero: number; total: number }): string {
  return enCss({ rvb: couleurZoneRvb({ numero, total }) });
}
