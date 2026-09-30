import { z } from 'zod';
import { geometriePlaneSchema } from './geojson';
import { zonageSchema, type Zonage } from './raster';
import { codeCrsSchema } from './systemes-coordonnees';

/**
 * Carte d'une parcelle prête à dessiner : contour et zonage dans un même système
 * de coordonnées métrique. Utilisée par le rapport PDF et l'espace client.
 */
export const carteParcelleSchema = z.object({
  crs: codeCrsSchema,
  contour: geometriePlaneSchema.nullable(),
  zonage: zonageSchema.nullable(),
});

export type CarteParcelle = z.infer<typeof carteParcelleSchema>;

export interface Emprise {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Rectangle englobant le contour et le zonage, `null` si la carte est vide. */
export function empriseCarte({ carte }: { carte: CarteParcelle }): Emprise | null {
  const xs: number[] = [];
  const ys: number[] = [];
  if (carte.contour) {
    const polygones =
      carte.contour.type === 'Polygon' ? [carte.contour.coordinates] : carte.contour.coordinates;
    for (const [x = NaN, y = NaN] of polygones.flat(2)) {
      xs.push(x);
      ys.push(y);
    }
  }
  if (carte.zonage) {
    const { origineX, origineY, resolutionX, resolutionY, largeur, hauteur } = carte.zonage;
    xs.push(origineX, origineX + resolutionX * largeur);
    ys.push(origineY, origineY + resolutionY * hauteur);
  }
  const finis = (valeurs: number[]) => valeurs.filter((valeur) => Number.isFinite(valeur));
  const [x, y] = [finis(xs), finis(ys)];
  if (x.length === 0 || y.length === 0) {
    return null;
  }
  return { minX: Math.min(...x), minY: Math.min(...y), maxX: Math.max(...x), maxY: Math.max(...y) };
}

/** Passage des coordonnées terrain aux coordonnées d'écran (y vers le bas). */
export interface Cadrage {
  echelle: number;
  decalageX: number;
  decalageY: number;
  maxY: number;
  minX: number;
}

interface CalculerCadrageParams {
  emprise: Emprise;
  largeur: number;
  hauteur: number;
  marge: number;
}

/** Cadrage qui fait tenir l'emprise dans un cadre, centrée, sans déformation. */
export function calculerCadrage({
  emprise,
  largeur,
  hauteur,
  marge,
}: CalculerCadrageParams): Cadrage {
  const largeurTerrain = Math.max(emprise.maxX - emprise.minX, 1e-9);
  const hauteurTerrain = Math.max(emprise.maxY - emprise.minY, 1e-9);
  const echelle = Math.min(
    (largeur - 2 * marge) / largeurTerrain,
    (hauteur - 2 * marge) / hauteurTerrain,
  );
  return {
    echelle,
    decalageX: (largeur - largeurTerrain * echelle) / 2,
    decalageY: (hauteur - hauteurTerrain * echelle) / 2,
    maxY: emprise.maxY,
    minX: emprise.minX,
  };
}

/** Point terrain → point écran. */
export function versEcran({ cadrage, x, y }: { cadrage: Cadrage; x: number; y: number }): {
  x: number;
  y: number;
} {
  return {
    x: cadrage.decalageX + (x - cadrage.minX) * cadrage.echelle,
    y: cadrage.decalageY + (cadrage.maxY - y) * cadrage.echelle,
  };
}

/** Suite horizontale de pixels contigus d'une même zone. */
export interface BandeZone {
  ligne: number;
  colonneDebut: number;
  longueur: number;
  zone: number;
}

/**
 * Pixels du zonage regroupés en bandes horizontales : bien moins de rectangles à dessiner
 * qu'un rectangle par pixel, pour un rendu identique.
 */
export function bandesZonage({ zonage }: { zonage: Zonage }): BandeZone[] {
  const bandes: BandeZone[] = [];
  for (let ligne = 0; ligne < zonage.hauteur; ligne++) {
    let courante: BandeZone | null = null;
    for (let colonne = 0; colonne < zonage.largeur; colonne++) {
      const zone = zonage.classes[ligne * zonage.largeur + colonne] ?? null;
      if (courante && zone === courante.zone) {
        courante.longueur += 1;
        continue;
      }
      courante = zone === null ? null : { ligne, colonneDebut: colonne, longueur: 1, zone };
      if (courante) {
        bandes.push(courante);
      }
    }
  }
  return bandes;
}
