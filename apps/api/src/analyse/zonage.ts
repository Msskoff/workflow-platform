import type { RasterNdvi, Zonage, Zone } from '@workflow/shared';

export type MethodeZonage = 'kmeans' | 'quantiles';

function quantile({ tries, rang }: { tries: readonly number[]; rang: number }): number {
  const position = Math.min(tries.length - 1, Math.max(0, Math.round(rang * (tries.length - 1))));
  return tries[position] ?? 0;
}

/** Centre de classe le plus proche d'une valeur. */
function plusProche({ valeur, centres }: { valeur: number; centres: readonly number[] }): number {
  let meilleur = 0;
  centres.forEach((centre, index) => {
    if (Math.abs(valeur - centre) < Math.abs(valeur - (centres[meilleur] ?? Infinity))) {
      meilleur = index;
    }
  });
  return meilleur;
}

/**
 * K-means à une dimension, initialisé sur les quantiles : déterministe, converge en
 * quelques itérations sur des valeurs NDVI. Renvoie les centres triés, sans classe vide.
 */
function kmeans1d({ valeurs, k }: { valeurs: readonly number[]; k: number }): number[] {
  const tries = [...valeurs].sort((a, b) => a - b);
  let centres = Array.from({ length: k }, (_, index) =>
    quantile({ tries, rang: (index + 0.5) / k }),
  );
  for (let iteration = 0; iteration < 100; iteration++) {
    const sommes = new Array<number>(centres.length).fill(0);
    const effectifs = new Array<number>(centres.length).fill(0);
    for (const valeur of tries) {
      const classe = plusProche({ valeur, centres });
      sommes[classe] = (sommes[classe] ?? 0) + valeur;
      effectifs[classe] = (effectifs[classe] ?? 0) + 1;
    }
    const nouveaux = centres
      .map((centre, index) =>
        (effectifs[index] ?? 0) > 0 ? (sommes[index] ?? 0) / (effectifs[index] ?? 1) : NaN,
      )
      .filter((centre) => Number.isFinite(centre));
    const stable =
      nouveaux.length === centres.length &&
      nouveaux.every((centre, index) => Math.abs(centre - (centres[index] ?? 0)) < 1e-6);
    centres = nouveaux;
    if (stable) {
      break;
    }
  }
  return [...new Set(centres)].sort((a, b) => a - b);
}

/** Bornes supérieures des classes par effectifs égaux (quantiles). */
function bornesQuantiles({ valeurs, k }: { valeurs: readonly number[]; k: number }): number[] {
  // La classe i s'arrête (incluse) à la valeur de rang ⌈n·(i+1)/k⌉ : effectifs égaux.
  const tries = [...valeurs].sort((a, b) => a - b);
  const bornes = Array.from(
    { length: k - 1 },
    (_, index) => tries[Math.ceil((tries.length * (index + 1)) / k) - 1] ?? 0,
  );
  return [...new Set(bornes)];
}

function arrondir({ valeur, decimales }: { valeur: number; decimales: number }): number {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

interface ZonerParams {
  raster: RasterNdvi;
  nombreZones: number;
  methode: MethodeZonage;
}

/**
 * Découpe la parcelle en zones homogènes de NDVI. Zone 1 = NDVI le plus faible.
 * Si les valeurs sont trop peu variées, moins de zones que demandé sont produites.
 */
export function zoner({ raster, nombreZones, methode }: ZonerParams): Zonage {
  const valides = raster.valeurs.filter((valeur): valeur is number => valeur !== null);
  if (valides.length === 0) {
    throw new Error('Aucun pixel NDVI valide à zoner');
  }
  const k = Math.min(nombreZones, new Set(valides).size);

  let classer: (valeur: number) => number;
  if (methode === 'kmeans') {
    const centres = kmeans1d({ valeurs: valides, k });
    classer = (valeur) => plusProche({ valeur, centres }) + 1;
  } else {
    const bornes = bornesQuantiles({ valeurs: valides, k });
    classer = (valeur) => {
      const rang = bornes.findIndex((borne) => valeur <= borne);
      return (rang === -1 ? bornes.length : rang) + 1;
    };
  }

  const classes = raster.valeurs.map((valeur) => (valeur === null ? null : classer(valeur)));
  const numeros = [...new Set(classes.filter((classe): classe is number => classe !== null))].sort(
    (a, b) => a - b,
  );
  // Renumérotation 1..n sans trou (une classe peut rester vide après quantiles).
  const renumerotation = new Map(numeros.map((numero, index) => [numero, index + 1]));
  const classesFinales = classes.map((classe) =>
    classe === null ? null : (renumerotation.get(classe) ?? null),
  );

  const zones: Zone[] = numeros.map((_, index) => {
    const numero = index + 1;
    const membres = raster.valeurs.filter(
      (valeur, position): valeur is number =>
        valeur !== null && classesFinales[position] === numero,
    );
    const moyenne = membres.reduce((somme, valeur) => somme + valeur, 0) / membres.length;
    return {
      numero,
      ndviMin: Math.min(...membres),
      ndviMax: Math.max(...membres),
      ndviMoyen: arrondir({ valeur: moyenne, decimales: 4 }),
      nombrePixels: membres.length,
      surfaceHa: arrondir({
        valeur: (membres.length * raster.surfacePixelM2) / 10_000,
        decimales: 4,
      }),
      partSurface: arrondir({ valeur: (membres.length / valides.length) * 100, decimales: 1 }),
    };
  });

  return {
    crs: raster.crs,
    largeur: raster.largeur,
    hauteur: raster.hauteur,
    origineX: raster.origineX,
    origineY: raster.origineY,
    resolutionX: raster.resolutionX,
    resolutionY: raster.resolutionY,
    surfacePixelM2: raster.surfacePixelM2,
    classes: classesFinales,
    zones,
  };
}
