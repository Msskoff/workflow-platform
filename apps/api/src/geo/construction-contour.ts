import convex from '@turf/convex';
import { featureCollection, point } from '@turf/helpers';
import type { GeometriePlane } from '@workflow/shared';

export type MethodeContour = 'trace' | 'enveloppe_convexe';

interface ConstruireContourParams {
  points: readonly [number, number][];
  methode: MethodeContour;
}

function memePosition({ a, b }: { a: readonly number[]; b: readonly number[] }): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Construit le polygone d'une parcelle à partir de points relevés :
 * - `trace` : les points sont le tour de la parcelle, dans l'ordre de relevé ;
 * - `enveloppe_convexe` : points dans le désordre, on prend l'enveloppe convexe.
 */
export function construireContour({ points, methode }: ConstruireContourParams): GeometriePlane {
  const distincts = points.filter(
    (position, index) => index === 0 || !memePosition({ a: position, b: points[index - 1] ?? [] }),
  );
  const premier = distincts[0];
  const dernier = distincts[distincts.length - 1];
  const sommets =
    premier && dernier && distincts.length > 1 && memePosition({ a: premier, b: dernier })
      ? distincts.slice(0, -1)
      : distincts;

  if (new Set(sommets.map((position) => position.join(','))).size < 3) {
    throw new Error(
      `Au moins 3 points distincts sont nécessaires pour former une parcelle (${sommets.length} reçus)`,
    );
  }

  if (methode === 'enveloppe_convexe') {
    const enveloppe = convex(featureCollection(sommets.map((position) => point([...position]))));
    if (!enveloppe) {
      throw new Error('Enveloppe convexe impossible : les points sont alignés');
    }
    return { type: 'Polygon', coordinates: enveloppe.geometry.coordinates };
  }

  const anneau = sommets.map((position) => [...position]);
  const debut = anneau[0];
  return { type: 'Polygon', coordinates: [debut ? [...anneau, [...debut]] : anneau] };
}
