import type { GeometriePlane } from '@workflow/shared';

interface PointDansAnneauParams {
  x: number;
  y: number;
  anneau: readonly (readonly number[])[];
}

/** Lancer de rayon : vrai si le point est à l'intérieur de l'anneau. */
function pointDansAnneau({ x, y, anneau }: PointDansAnneauParams): boolean {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi = 0, yi = 0] = anneau[i] ?? [];
    const [xj = 0, yj = 0] = anneau[j] ?? [];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

interface PointDansGeometrieParams {
  x: number;
  y: number;
  geometrie: GeometriePlane;
}

/** Vrai si le point est dans un des polygones (dans l'extérieur et hors des trous). */
export function pointDansGeometrie({ x, y, geometrie }: PointDansGeometrieParams): boolean {
  const polygones = geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates;
  return polygones.some(([exterieur, ...trous]) =>
    exterieur
      ? pointDansAnneau({ x, y, anneau: exterieur }) &&
        !trous.some((trou) => pointDansAnneau({ x, y, anneau: trou }))
      : false,
  );
}
