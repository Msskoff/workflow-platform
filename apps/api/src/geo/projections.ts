import {
  systemesCoordonnees,
  type CodeCrs,
  type GeometrieGeoreferencee,
  type GeometriePlane,
} from '@workflow/shared';
import proj4 from 'proj4';

/** Définitions proj4 des systèmes de coordonnées pris en charge (source : epsg.io). */
const DEFINITIONS_PROJ4: Readonly<Record<CodeCrs, string>> = {
  'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs',
  'EPSG:2154':
    '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  'EPSG:32630': '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs',
  'EPSG:32631': '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs',
  'EPSG:32632': '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',
  'EPSG:3035':
    '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  'EPSG:3857':
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs',
};

for (const [code, definition] of Object.entries(DEFINITIONS_PROJ4)) {
  proj4.defs(code, definition);
}

/** Arrondi : 1e-8 degré ≈ 1 mm ; 1 mm pour les systèmes métriques. */
const PRECISION: Readonly<Record<'degre' | 'metre', number>> = { degre: 1e8, metre: 1e3 };

interface ReprojeterPositionsParams {
  geometrie: GeometriePlane;
  transformer: (position: [number, number]) => [number, number];
}

function reprojeterPositions({
  geometrie,
  transformer,
}: ReprojeterPositionsParams): GeometriePlane {
  const convertir = (position: number[]): number[] => {
    const [x = 0, y = 0, ...reste] = position;
    return [...transformer([x, y]), ...reste];
  };
  if (geometrie.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometrie.coordinates.map((anneau) => anneau.map(convertir)),
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometrie.coordinates.map((polygone) =>
      polygone.map((anneau) => anneau.map(convertir)),
    ),
  };
}

interface ReprojeterParams {
  source: GeometrieGeoreferencee;
  vers: CodeCrs;
}

/** Reprojette une géométrie vers le système cible (copie inchangée si c'est déjà le cas). */
export function reprojeter({ source, vers }: ReprojeterParams): GeometrieGeoreferencee {
  if (source.crs === vers) {
    return structuredClone(source);
  }
  const conversion = proj4(source.crs, vers);
  const facteur = PRECISION[systemesCoordonnees[vers].unite];
  const arrondir = (valeur: number) => Math.round(valeur * facteur) / facteur;

  return {
    crs: vers,
    geometrie: reprojeterPositions({
      geometrie: source.geometrie,
      transformer: (position) => {
        const [x, y] = conversion.forward(position);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          throw new Error(
            `Reprojection ${source.crs} → ${vers} impossible pour le point ${position.join(' ; ')} : vérifiez le système de coordonnées source`,
          );
        }
        return [arrondir(x), arrondir(y)];
      },
    }),
  };
}
