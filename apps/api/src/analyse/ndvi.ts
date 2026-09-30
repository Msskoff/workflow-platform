import {
  systemesCoordonnees,
  type GeometrieGeoreferencee,
  type RasterNdvi,
} from '@workflow/shared';
import { pointDansGeometrie } from '../geo/point-dans-polygone';
import { reprojeter } from '../geo/projections';
import type { ImageMultibande } from '../raster/lecture-geotiff';

export interface StatistiquesNdvi {
  ndviMoyen: number;
  ndviMin: number;
  ndviMax: number;
  ndviEcartType: number;
  pixelsValides: number;
  surfaceCouverteHa: number;
}

/** Surface d'un pixel en m² ; approximation locale pour une image en degrés. */
function surfacePixelM2({ image }: { image: ImageMultibande }): number {
  if (systemesCoordonnees[image.crs].unite === 'metre') {
    return Math.abs(image.resolutionX * image.resolutionY);
  }
  const latitudeCentre = image.origineY + (image.resolutionY * image.hauteur) / 2;
  const metresParDegreLon = 111_320 * Math.cos((latitudeCentre * Math.PI) / 180);
  return Math.abs(image.resolutionX * metresParDegreLon * image.resolutionY * 110_574);
}

function arrondir({ valeur, decimales }: { valeur: number; decimales: number }): number {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

interface CalculerNdviParams {
  image: ImageMultibande;
  /** Numéros de bande, à partir de 1. */
  bandeRouge: number;
  bandePir: number;
  /** Ajouté aux valeurs brutes avant calcul (ex. −1000 pour Sentinel-2 L2A récent). */
  decalage: number;
  /** Si fournie, seuls les pixels dont le centre est dans la parcelle sont gardés. */
  masque: GeometrieGeoreferencee | null;
}

/**
 * NDVI = (PIR − Rouge) / (PIR + Rouge) par pixel, masqué sur la parcelle, puis recadré
 * sur l'emprise des pixels valides. Pixels sans donnée ou saturés à 0 : `null`.
 */
export function calculerNdvi({
  image,
  bandeRouge,
  bandePir,
  decalage,
  masque,
}: CalculerNdviParams): { raster: RasterNdvi; statistiques: StatistiquesNdvi } {
  const rouge = image.bandes[bandeRouge - 1];
  const pir = image.bandes[bandePir - 1];
  if (!rouge || !pir) {
    throw new Error(
      `L’image a ${image.bandes.length} bande(s) : bandes ${bandeRouge} (rouge) et ${bandePir} (PIR) introuvables`,
    );
  }
  const contour = masque ? reprojeter({ source: masque, vers: image.crs }).geometrie : null;

  const complet: (number | null)[] = new Array(image.largeur * image.hauteur).fill(null);
  let [colMin, colMax, ligMin, ligMax] = [Infinity, -Infinity, Infinity, -Infinity];

  for (let ligne = 0; ligne < image.hauteur; ligne++) {
    for (let colonne = 0; colonne < image.largeur; colonne++) {
      const index = ligne * image.largeur + colonne;
      const brutRouge = rouge[index] ?? NaN;
      const brutPir = pir[index] ?? NaN;
      if (image.nodata !== null && (brutRouge === image.nodata || brutPir === image.nodata)) {
        continue;
      }
      if (contour) {
        const x = image.origineX + (colonne + 0.5) * image.resolutionX;
        const y = image.origineY + (ligne + 0.5) * image.resolutionY;
        if (!pointDansGeometrie({ x, y, geometrie: contour })) {
          continue;
        }
      }
      const r = brutRouge + decalage;
      const n = brutPir + decalage;
      if (!Number.isFinite(r) || !Number.isFinite(n) || r + n <= 0) {
        continue;
      }
      complet[index] = arrondir({
        valeur: Math.max(-1, Math.min(1, (n - r) / (n + r))),
        decimales: 4,
      });
      [colMin, colMax] = [Math.min(colMin, colonne), Math.max(colMax, colonne)];
      [ligMin, ligMax] = [Math.min(ligMin, ligne), Math.max(ligMax, ligne)];
    }
  }

  if (colMin === Infinity) {
    throw new Error(
      contour
        ? 'Aucun pixel valide dans la parcelle : l’image ne la recouvre pas (vérifiez l’emprise et le système de coordonnées)'
        : 'Aucun pixel valide dans l’image',
    );
  }

  const largeur = colMax - colMin + 1;
  const hauteur = ligMax - ligMin + 1;
  const valeurs = Array.from({ length: largeur * hauteur }, (_, index) => {
    const ligne = ligMin + Math.floor(index / largeur);
    const colonne = colMin + (index % largeur);
    return complet[ligne * image.largeur + colonne] ?? null;
  });
  const valides = valeurs.filter((valeur): valeur is number => valeur !== null);
  const moyenne = valides.reduce((somme, valeur) => somme + valeur, 0) / valides.length;
  const variance =
    valides.reduce((somme, valeur) => somme + (valeur - moyenne) ** 2, 0) / valides.length;
  const surfacePixel = surfacePixelM2({ image });

  return {
    raster: {
      crs: image.crs,
      largeur,
      hauteur,
      origineX: image.origineX + colMin * image.resolutionX,
      origineY: image.origineY + ligMin * image.resolutionY,
      resolutionX: image.resolutionX,
      resolutionY: image.resolutionY,
      surfacePixelM2: surfacePixel,
      valeurs,
    },
    statistiques: {
      ndviMoyen: arrondir({ valeur: moyenne, decimales: 4 }),
      ndviMin: Math.min(...valides),
      ndviMax: Math.max(...valides),
      ndviEcartType: arrondir({ valeur: Math.sqrt(variance), decimales: 4 }),
      pixelsValides: valides.length,
      surfaceCouverteHa: arrondir({
        valeur: (valides.length * surfacePixel) / 10_000,
        decimales: 4,
      }),
    },
  };
}
