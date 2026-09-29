import type { GeometrieParcelle, Position } from './geojson';

/** Rayon terrestre moyen (IUGG), en mètres. */
const RAYON_TERRE_M = 6_371_008.8;
const M2_PAR_HECTARE = 10_000;

function enRadians(degres: number): number {
  return (degres * Math.PI) / 180;
}

/** Aire sphérique d'un anneau fermé en m² (méthode de Chamberlain & Duquette, comme turf.js). */
function aireAnneauM2(anneau: readonly Position[]): number {
  const n = anneau.length;
  if (n < 3) {
    return 0;
  }

  let somme = 0;
  for (let i = 0; i < n; i++) {
    const precedent = anneau[i];
    const courant = anneau[(i + 1) % n];
    const suivant = anneau[(i + 2) % n];
    if (!precedent || !courant || !suivant) {
      continue;
    }
    somme += (enRadians(suivant[0]) - enRadians(precedent[0])) * Math.sin(enRadians(courant[1]));
  }

  return Math.abs((somme * RAYON_TERRE_M * RAYON_TERRE_M) / 2);
}

/** Aire d'un polygone en m² : anneau extérieur moins les trous. */
function airePolygoneM2(anneaux: readonly (readonly Position[])[]): number {
  const [exterieur, ...trous] = anneaux;
  if (!exterieur) {
    return 0;
  }
  const aireTrous = trous.reduce((total, trou) => total + aireAnneauM2(trou), 0);
  return Math.max(0, aireAnneauM2(exterieur) - aireTrous);
}

interface CalculerSurfaceHaParams {
  geometrie: GeometrieParcelle;
}

/** Surface d'une géométrie de parcelle en hectares, arrondie à 4 décimales (1 m²). */
export function calculerSurfaceHa({ geometrie }: CalculerSurfaceHaParams): number {
  const polygones = geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates;
  const aireM2 = polygones.reduce((total, polygone) => total + airePolygoneM2(polygone), 0);
  return Math.round((aireM2 / M2_PAR_HECTARE) * 10_000) / 10_000;
}
