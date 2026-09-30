import type { GeometriePlane } from '@workflow/shared';

/** BOM UTF-8 que certains tableurs placent en tête de fichier. */
const BOM = String.fromCharCode(0xfeff);

export type FormatGps = 'auto' | 'geojson' | 'csv';

/** Contenu d'un fichier GPS : soit des points relevés, soit un contour déjà fermé. */
export type LectureGps =
  | { nature: 'points'; points: [number, number][] }
  | { nature: 'contour'; geometrie: GeometriePlane };

const NOMS_COLONNES_X = ['longitude', 'lon', 'lng', 'long', 'x', 'easting', 'est'];
const NOMS_COLONNES_Y = ['latitude', 'lat', 'y', 'northing', 'nord'];

function normaliserNom(nom: string): string {
  return nom
    .trim()
    .replace(/^["']|["']$/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Séparateur le plus fréquent de la ligne d'en-tête parmi `;`, tabulation et `,`. */
function detecterSeparateur(entete: string): string {
  const candidats = [';', '\t', ','];
  const comptes = candidats.map((separateur) => entete.split(separateur).length - 1);
  const meilleur = comptes.indexOf(Math.max(...comptes));
  return candidats[meilleur] ?? ',';
}

interface TrouverColonneParams {
  colonnes: string[];
  imposee: string;
  candidats: readonly string[];
  role: string;
}

function trouverColonne({ colonnes, imposee, candidats, role }: TrouverColonneParams): number {
  const recherches = imposee.trim() ? [normaliserNom(imposee)] : candidats;
  const index = colonnes.findIndex((colonne) => recherches.includes(colonne));
  if (index === -1) {
    throw new Error(
      `Colonne ${role} introuvable (colonnes : ${colonnes.join(', ')}). Renseignez-la dans les paramètres.`,
    );
  }
  return index;
}

interface LireCsvParams {
  contenu: string;
  colonneX: string;
  colonneY: string;
}

/**
 * CSV de points avec ligne d'en-tête. Séparateur détecté (`;`, tabulation, `,`) ;
 * avec `;` ou tabulation, la virgule décimale française est acceptée.
 */
function lireCsv({ contenu, colonneX, colonneY }: LireCsvParams): LectureGps {
  const lignes = contenu.split(/\r?\n/).filter((ligne) => ligne.trim() !== '');
  const [entete, ...donnees] = lignes;
  if (!entete || donnees.length === 0) {
    throw new Error(
      'CSV vide : une ligne d’en-tête puis au moins une ligne de points sont attendues',
    );
  }

  const separateur = detecterSeparateur(entete);
  const colonnes = entete.split(separateur).map(normaliserNom);
  const indexX = trouverColonne({
    colonnes,
    imposee: colonneX,
    candidats: NOMS_COLONNES_X,
    role: 'X / longitude',
  });
  const indexY = trouverColonne({
    colonnes,
    imposee: colonneY,
    candidats: NOMS_COLONNES_Y,
    role: 'Y / latitude',
  });
  const virguleDecimale = separateur !== ',';

  const points = donnees.map((ligne, rang): [number, number] => {
    const cellules = ligne.split(separateur);
    const lireNombre = (index: number) => {
      const brut = (cellules[index] ?? '').trim().replace(/^["']|["']$/g, '');
      return Number(virguleDecimale ? brut.replace(',', '.') : brut);
    };
    const x = lireNombre(indexX);
    const y = lireNombre(indexY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`CSV ligne ${rang + 2} : coordonnées non numériques (« ${ligne.trim()} »)`);
    }
    return [x, y];
  });
  return { nature: 'points', points };
}

type GeometrieGeoJson = { type: string; coordinates?: unknown; geometries?: unknown };

/** Parcourt un objet GeoJSON et répartit ses géométries en points et en polygones. */
function collecterGeometries({ objet }: { objet: unknown }): {
  points: [number, number][];
  polygones: number[][][][];
} {
  const points: [number, number][] = [];
  const polygones: number[][][][] = [];
  const pile: unknown[] = [objet];

  for (let courant = pile.pop(); courant !== undefined; courant = pile.pop()) {
    if (typeof courant !== 'object' || courant === null) {
      continue;
    }
    const { type, coordinates } = courant as GeometrieGeoJson;
    const versPoint = (position: unknown): [number, number] => {
      const [x, y] = position as number[];
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('GeoJSON : position non numérique');
      }
      return [x, y];
    };

    switch (type) {
      case 'FeatureCollection':
        pile.push(...((courant as { features?: unknown[] }).features ?? []).reverse());
        break;
      case 'Feature':
        pile.push((courant as { geometry?: unknown }).geometry);
        break;
      case 'GeometryCollection':
        pile.push(...((courant as { geometries?: unknown[] }).geometries ?? []).reverse());
        break;
      case 'Point':
        points.push(versPoint(coordinates));
        break;
      case 'MultiPoint':
      case 'LineString':
        points.push(...(coordinates as unknown[]).map(versPoint));
        break;
      case 'Polygon':
        polygones.push(coordinates as number[][][]);
        break;
      case 'MultiPolygon':
        polygones.push(...(coordinates as number[][][][]));
        break;
      default:
        throw new Error(`GeoJSON : type « ${String(type)} » non pris en charge`);
    }
  }
  return { points, polygones };
}

function lireGeoJson({ contenu }: { contenu: string }): LectureGps {
  let objet: unknown;
  try {
    objet = JSON.parse(contenu);
  } catch {
    throw new Error('GeoJSON illisible : le contenu n’est pas du JSON valide');
  }
  const { points, polygones } = collecterGeometries({ objet });
  const [unique] = polygones;
  if (unique) {
    return {
      nature: 'contour',
      geometrie:
        polygones.length === 1
          ? { type: 'Polygon', coordinates: unique }
          : { type: 'MultiPolygon', coordinates: polygones },
    };
  }
  return { nature: 'points', points };
}

interface LireFichierGpsParams {
  contenu: string;
  format: FormatGps;
  colonneX: string;
  colonneY: string;
}

/** Lit un fichier GPS GeoJSON (points, trace, contour) ou CSV de points. */
export function lireFichierGps({
  contenu,
  format,
  colonneX,
  colonneY,
}: LireFichierGpsParams): LectureGps {
  // Retire l'éventuel BOM UTF-8 ajouté par les tableurs.
  const texte = (contenu.startsWith(BOM) ? contenu.slice(1) : contenu).trim();
  if (texte === '') {
    throw new Error('Aucun fichier GPS : chargez un fichier GeoJSON ou CSV dans les paramètres');
  }
  const formatEffectif = format === 'auto' ? (/^[{[]/.test(texte) ? 'geojson' : 'csv') : format;
  return formatEffectif === 'geojson'
    ? lireGeoJson({ contenu: texte })
    : lireCsv({ contenu: texte, colonneX, colonneY });
}
