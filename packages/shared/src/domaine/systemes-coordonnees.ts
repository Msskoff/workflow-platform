import { z } from 'zod';
import { geometriePlaneSchema } from './geojson';

/** Systèmes de coordonnées pris en charge, identifiés par leur code EPSG. */
export const systemesCoordonnees = {
  'EPSG:4326': { libelle: 'WGS 84 : GPS, degrés', unite: 'degre' },
  'EPSG:2154': { libelle: 'RGF93 / Lambert-93 : France métropolitaine', unite: 'metre' },
  'EPSG:32630': { libelle: 'WGS 84 / UTM 30N : ouest de la France', unite: 'metre' },
  'EPSG:32631': { libelle: 'WGS 84 / UTM 31N : centre de la France', unite: 'metre' },
  'EPSG:32632': { libelle: 'WGS 84 / UTM 32N : est de la France', unite: 'metre' },
  'EPSG:3035': { libelle: 'ETRS89 / LAEA Europe : surfaces', unite: 'metre' },
  'EPSG:3857': { libelle: 'Web Mercator : fonds de carte web', unite: 'metre' },
} as const satisfies Record<string, { libelle: string; unite: 'degre' | 'metre' }>;

export type CodeCrs = keyof typeof systemesCoordonnees;

export const codesCrs = Object.keys(systemesCoordonnees) as [CodeCrs, ...CodeCrs[]];

export const codeCrsSchema = z.enum(codesCrs);

/** Libellés des systèmes de coordonnées, pour les listes de choix de l'éditeur. */
export const libellesCrs: Readonly<Record<CodeCrs, string>> = Object.fromEntries(
  codesCrs.map((code) => [code, `${code} · ${systemesCoordonnees[code].libelle}`]),
) as Record<CodeCrs, string>;

/** Géométrie accompagnée de son système de coordonnées. */
export const geometrieGeoreferenceeSchema = z.object({
  crs: codeCrsSchema,
  geometrie: geometriePlaneSchema,
});

export type GeometrieGeoreferencee = z.infer<typeof geometrieGeoreferenceeSchema>;
