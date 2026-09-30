type Rvb = readonly [number, number, number];

/** Palette NDVI usuelle : sol nu (brun) → végétation dense (vert foncé). */
const PALETTE_NDVI: readonly (readonly [number, Rvb])[] = [
  [-0.2, [165, 0, 38]],
  [0.2, [253, 174, 97]],
  [0.4, [254, 224, 139]],
  [0.6, [166, 217, 106]],
  [0.8, [26, 152, 80]],
  [1, [0, 104, 55]],
];

function versCss({ rvb }: { rvb: Rvb }): string {
  return `rgb(${rvb.map((canal) => Math.round(canal)).join(',')})`;
}

/** Couleur d'une valeur NDVI, interpolée linéairement entre les paliers de la palette. */
export function couleurNdvi({ ndvi }: { ndvi: number }): string {
  const [premier] = PALETTE_NDVI;
  const dernier = PALETTE_NDVI[PALETTE_NDVI.length - 1];
  if (!premier || !dernier) {
    return 'transparent';
  }
  if (ndvi <= premier[0]) {
    return versCss({ rvb: premier[1] });
  }
  for (let index = 1; index < PALETTE_NDVI.length; index++) {
    const [seuilHaut, couleurHaut] = PALETTE_NDVI[index] ?? dernier;
    const [seuilBas, couleurBas] = PALETTE_NDVI[index - 1] ?? premier;
    if (ndvi <= seuilHaut) {
      const t = (ndvi - seuilBas) / (seuilHaut - seuilBas);
      return versCss({
        rvb: [0, 1, 2].map(
          (canal) =>
            (couleurBas[canal] ?? 0) + t * ((couleurHaut[canal] ?? 0) - (couleurBas[canal] ?? 0)),
        ) as unknown as Rvb,
      });
    }
  }
  return versCss({ rvb: dernier[1] });
}

/** Couleur d'une zone : de la plus faible (orange) à la plus vigoureuse (vert foncé). */
export function couleurZone({ numero, total }: { numero: number; total: number }): string {
  const ndviEquivalent = total <= 1 ? 0.6 : 0.3 + ((numero - 1) / (total - 1)) * 0.55;
  return couleurNdvi({ ndvi: ndviEquivalent });
}
