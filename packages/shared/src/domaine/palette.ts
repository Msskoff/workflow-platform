/** Couleur RVB (0-255). */
export type Rvb = readonly [number, number, number];

/** Palette NDVI usuelle : sol nu (brun) → végétation dense (vert foncé). */
const PALETTE_NDVI: readonly (readonly [number, Rvb])[] = [
  [-0.2, [165, 0, 38]],
  [0.2, [253, 174, 97]],
  [0.4, [254, 224, 139]],
  [0.6, [166, 217, 106]],
  [0.8, [26, 152, 80]],
  [1, [0, 104, 55]],
];

/** Couleur d'une valeur NDVI, interpolée linéairement entre les paliers de la palette. */
export function couleurNdviRvb({ ndvi }: { ndvi: number }): Rvb {
  let precedent = PALETTE_NDVI[0];
  for (const palier of PALETTE_NDVI) {
    if (!precedent || ndvi <= precedent[0]) {
      return palier[1];
    }
    if (ndvi <= palier[0]) {
      const t = (ndvi - precedent[0]) / (palier[0] - precedent[0]);
      const [bas, haut] = [precedent[1], palier[1]];
      return [0, 1, 2].map(
        (canal) => (bas[canal] ?? 0) + t * ((haut[canal] ?? 0) - (bas[canal] ?? 0)),
      ) as unknown as Rvb;
    }
    precedent = palier;
  }
  return precedent?.[1] ?? [0, 0, 0];
}

/** Couleur d'une zone : de la plus faible (orange) à la plus vigoureuse (vert foncé). */
export function couleurZoneRvb({ numero, total }: { numero: number; total: number }): Rvb {
  const ndviEquivalent = total <= 1 ? 0.6 : 0.3 + ((numero - 1) / (total - 1)) * 0.55;
  return couleurNdviRvb({ ndvi: ndviEquivalent });
}

/** `rgb(r,g,b)` pour le CSS et le SVG. */
export function enCss({ rvb }: { rvb: Rvb }): string {
  return `rgb(${rvb.map((canal) => Math.round(canal)).join(',')})`;
}

/** Nom d'une zone compréhensible par l'agriculteur (zone 1 = vigueur la plus faible). */
export function libelleZone({ numero, total }: { numero: number; total: number }): string {
  if (total <= 1) {
    return 'Vigueur homogène';
  }
  if (numero === 1) {
    return 'Vigueur faible';
  }
  if (numero === total) {
    return 'Vigueur forte';
  }
  return total === 3 ? 'Vigueur moyenne' : `Vigueur intermédiaire (${numero})`;
}
