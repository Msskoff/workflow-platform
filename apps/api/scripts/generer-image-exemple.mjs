// Génère exemples/sentinel2-parcelle.tif : image synthétique au format Sentinel-2 L2A
// (B04 rouge, B08 proche infrarouge, uint16, réflectance × 10 000, 10 m, UTM 31N)
// couvrant la parcelle d'exemple, avec trois bandes de vigueur d'ouest en est.
// Usage : node scripts/generer-image-exemple.mjs (depuis apps/api)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { writeArrayBuffer } from 'geotiff';
import proj4 from 'proj4';

const UTM31N = '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs';
const RESOLUTION = 10;
const MARGE = 30;

// Emprise de parcelle-contour.geojson (WGS84).
const coins = [
  [1.4799, 48.44],
  [1.4862, 48.4431],
].map((position) => proj4('EPSG:4326', UTM31N, position));
const xMin = Math.floor((Math.min(coins[0][0], coins[1][0]) - MARGE) / RESOLUTION) * RESOLUTION;
const xMax = Math.ceil((Math.max(coins[0][0], coins[1][0]) + MARGE) / RESOLUTION) * RESOLUTION;
const yMin = Math.floor((Math.min(coins[0][1], coins[1][1]) - MARGE) / RESOLUTION) * RESOLUTION;
const yMax = Math.ceil((Math.max(coins[0][1], coins[1][1]) + MARGE) / RESOLUTION) * RESOLUTION;
const largeur = (xMax - xMin) / RESOLUTION;
const hauteur = (yMax - yMin) / RESOLUTION;

// Générateur pseudo-aléatoire déterministe : l'image est identique à chaque génération.
let graine = 42;
const aleatoire = () => {
  graine = (graine * 1_103_515_245 + 12_345) % 2 ** 31;
  return graine / 2 ** 31;
};

const valeurs = new Uint16Array(largeur * hauteur * 2);
for (let ligne = 0; ligne < hauteur; ligne++) {
  for (let colonne = 0; colonne < largeur; colonne++) {
    const x = xMin + (colonne + 0.5) * RESOLUTION;
    const position = (x - xMin - MARGE) / (xMax - xMin - 2 * MARGE);
    const dansChamp = position >= 0 && position <= 1 && ligne >= 3 && ligne < hauteur - 3;
    const ndviCible = !dansChamp ? 0.15 : position < 1 / 3 ? 0.35 : position < 2 / 3 ? 0.6 : 0.8;
    const ndvi = ndviCible + (aleatoire() - 0.5) * 0.06;
    const rouge = Math.round(700 + (aleatoire() - 0.5) * 80);
    const pir = Math.round((rouge * (1 + ndvi)) / (1 - ndvi));
    const index = (ligne * largeur + colonne) * 2;
    valeurs[index] = rouge;
    valeurs[index + 1] = pir;
  }
}

const contenu = writeArrayBuffer(valeurs, {
  width: largeur,
  height: hauteur,
  SamplesPerPixel: 2,
  BitsPerSample: [16, 16],
  SampleFormat: [1, 1],
  ModelPixelScale: [RESOLUTION, RESOLUTION, 0],
  ModelTiepoint: [0, 0, 0, xMin, yMax, 0],
  GTModelTypeGeoKey: 1,
  ProjectedCSTypeGeoKey: 32631,
});

const destination = fileURLToPath(new URL('../exemples/sentinel2-parcelle.tif', import.meta.url));
writeFileSync(destination, Buffer.from(contenu));
console.log(`${destination} : ${largeur} × ${hauteur} pixels, ${contenu.byteLength} octets`);
