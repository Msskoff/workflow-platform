import { z } from 'zod';

/**
 * Indicateurs chiffrés produits par un nœud d'analyse (surface, NDVI moyen…),
 * indexés par clé. Ce sont les grandeurs sur lesquelles portent les règles métier.
 */
export const indicateursSchema = z.record(z.string().min(1), z.number());

export type Indicateurs = z.infer<typeof indicateursSchema>;

/**
 * Catalogue des indicateurs connus : les nœuds y choisissent ceux qu'ils publient,
 * l'éditeur de règles et les explications y prennent libellés et unités.
 */
export const catalogueIndicateurs = {
  surfaceHa: { libelle: 'Surface', unite: 'ha' },
  perimetreM: { libelle: 'Périmètre', unite: 'm' },
  indiceCompacite: { libelle: 'Indice de compacité (1 = disque)', unite: '' },
  ndviMoyen: { libelle: 'NDVI moyen', unite: '' },
  ndviMin: { libelle: 'NDVI minimum', unite: '' },
  ndviMax: { libelle: 'NDVI maximum', unite: '' },
  ndviEcartType: { libelle: 'Écart-type du NDVI', unite: '' },
  pixelsValides: { libelle: 'Pixels NDVI valides', unite: '' },
  surfaceCouverteHa: { libelle: 'Surface couverte par l’image', unite: 'ha' },
  nombreZones: { libelle: 'Nombre de zones', unite: '' },
  heterogeneiteNdviPourcent: {
    libelle: 'Hétérogénéité du NDVI (coefficient de variation)',
    unite: '%',
  },
  ecartNdviZones: { libelle: 'Écart de NDVI entre zones extrêmes', unite: '' },
  partZoneFaiblePourcent: { libelle: 'Part de la zone la plus faible', unite: '%' },
} as const satisfies Record<string, { libelle: string; unite: string }>;

export type CleIndicateur = keyof typeof catalogueIndicateurs;

/** Définitions `{ cle, libelle, unite }` d'indicateurs du catalogue, pour déclarer un port. */
export function indicateursDuCatalogue({ cles }: { cles: readonly CleIndicateur[] }) {
  return cles.map((cle) => ({ cle, ...catalogueIndicateurs[cle] }));
}

/** Libellé d'un indicateur (la clé elle-même s'il est hors catalogue). */
export function libelleIndicateur({ cle }: { cle: string }): string {
  return cle in catalogueIndicateurs ? catalogueIndicateurs[cle as CleIndicateur].libelle : cle;
}
