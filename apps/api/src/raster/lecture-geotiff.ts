import { codeCrsSchema, codesCrs, type CodeCrs } from '@workflow/shared';
import { fromArrayBuffer } from 'geotiff';

/** Au-delà, l'image doit être découpée sur la parcelle avant import (≈ 10 km × 10 km à 10 m). */
export const PIXELS_MAX = 1_000_000;

/** Image multibande géoréférencée, bandes rangées ligne par ligne. */
export interface ImageMultibande {
  crs: CodeCrs;
  largeur: number;
  hauteur: number;
  /** Coin haut-gauche. */
  origineX: number;
  origineY: number;
  resolutionX: number;
  /** Négative pour une image orientée nord en haut. */
  resolutionY: number;
  bandes: ArrayLike<number>[];
  nodata: number | null;
}

/** Code EPSG déclaré dans les clés GeoTIFF (32767 = système « défini par l'utilisateur »). */
function crsDeclare({ cles }: { cles: Record<string, unknown> }): string | null {
  const code = cles.ProjectedCSTypeGeoKey ?? cles.GeographicTypeGeoKey;
  return typeof code === 'number' && code !== 32767 ? `EPSG:${code}` : null;
}

interface LireGeoTiffParams {
  /** Contenu du fichier GeoTIFF encodé en base64. */
  base64: string;
  /** Système à utiliser si le fichier n'en déclare pas (ou pour le corriger). */
  crsForce: CodeCrs | null;
}

/** Lit un GeoTIFF (Sentinel-2 découpé sur la parcelle, par exemple) : bandes et géoréférencement. */
export async function lireGeoTiff({
  base64,
  crsForce,
}: LireGeoTiffParams): Promise<ImageMultibande> {
  if (base64.trim() === '') {
    throw new Error('Aucune image : chargez un fichier GeoTIFF dans les paramètres');
  }
  const octets = Buffer.from(base64, 'base64');
  let image;
  try {
    const tiff = await fromArrayBuffer(
      octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength),
    );
    image = await tiff.getImage();
  } catch {
    throw new Error('Image illisible : un fichier GeoTIFF est attendu');
  }

  const largeur = image.getWidth();
  const hauteur = image.getHeight();
  if (largeur * hauteur > PIXELS_MAX) {
    throw new Error(
      `Image trop grande (${largeur} × ${hauteur} pixels) : découpez-la sur la parcelle avant l’import`,
    );
  }

  const declare = crsDeclare({ cles: image.getGeoKeys() ?? {} });
  const crs = crsForce ?? codeCrsSchema.safeParse(declare).data;
  if (!crs) {
    throw new Error(
      `Système de coordonnées de l’image ${declare ?? 'non déclaré'} : choisissez-le dans les paramètres (${codesCrs.join(', ')})`,
    );
  }

  const [origineX = 0, origineY = 0] = image.getOrigin();
  const [resolutionX = 0, resolutionY = 0] = image.getResolution();
  const bandes = (await image.readRasters()) as unknown as ArrayLike<number>[];

  return {
    crs,
    largeur,
    hauteur,
    origineX,
    origineY,
    resolutionX,
    resolutionY,
    bandes: [...bandes],
    nodata: image.getGDALNoData(),
  };
}
