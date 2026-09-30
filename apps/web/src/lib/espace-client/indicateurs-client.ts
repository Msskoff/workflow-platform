import type { Indicateurs } from '@workflow/shared';

/** Indicateur présenté au client, formulé sans jargon. */
export interface IndicateurClient {
  cle: string;
  libelle: string;
  /** Aide courte affichée sous le libellé. */
  aide: string;
  unite: string;
  decimales: number;
  /** `hausse` : une valeur plus élevée est une bonne nouvelle ; `baisse` : l'inverse. */
  favorable: 'hausse' | 'baisse' | 'neutre';
}

/** Indicateurs montrés dans l'espace client, dans l'ordre d'affichage. */
export const INDICATEURS_CLIENT: readonly IndicateurClient[] = [
  {
    cle: 'ndviMoyen',
    libelle: 'Vigueur moyenne',
    aide: 'Indice NDVI de 0 à 1 : plus il est haut, plus la végétation est dense.',
    unite: '',
    decimales: 2,
    favorable: 'hausse',
  },
  {
    cle: 'partZoneFaiblePourcent',
    libelle: 'Part en vigueur faible',
    aide: 'Surface de la zone la plus faible, en % de la parcelle.',
    unite: '%',
    decimales: 0,
    favorable: 'baisse',
  },
  {
    cle: 'heterogeneiteNdviPourcent',
    libelle: 'Écarts dans la parcelle',
    aide: 'Plus ce chiffre est bas, plus la parcelle est homogène.',
    unite: '%',
    decimales: 0,
    favorable: 'baisse',
  },
  {
    cle: 'nombreZones',
    libelle: 'Zones de vigueur',
    aide: 'Nombre de zones de comportement différent.',
    unite: '',
    decimales: 0,
    favorable: 'neutre',
  },
];

/** Valeur formatée à la française, avec son unité. */
export function formaterValeur({
  valeur,
  indicateur,
}: {
  valeur: number;
  indicateur: IndicateurClient;
}): string {
  const texte = valeur.toLocaleString('fr-FR', {
    minimumFractionDigits: indicateur.decimales,
    maximumFractionDigits: indicateur.decimales,
  });
  return indicateur.unite ? `${texte} ${indicateur.unite}` : texte;
}

/** Indicateurs du client présents dans un jeu d'indicateurs. */
export function indicateursPresents({
  indicateurs,
}: {
  indicateurs: Indicateurs;
}): IndicateurClient[] {
  return INDICATEURS_CLIENT.filter((indicateur) => indicateurs[indicateur.cle] !== undefined);
}

/** Évolution d'un indicateur entre deux dates, qualifiée pour le client. */
export function qualifierEvolution({
  avant,
  apres,
  indicateur,
}: {
  avant: number;
  apres: number;
  indicateur: IndicateurClient;
}): { ecart: number; tendance: 'mieux' | 'moins_bien' | 'stable' } {
  const ecart = apres - avant;
  const seuil = 0.5 * 10 ** -indicateur.decimales;
  if (Math.abs(ecart) < seuil || indicateur.favorable === 'neutre') {
    return { ecart, tendance: 'stable' };
  }
  const hausse = ecart > 0;
  return {
    ecart,
    tendance: hausse === (indicateur.favorable === 'hausse') ? 'mieux' : 'moins_bien',
  };
}

/**
 * Moment lisible : « 12 juin 2026 à 14:05 » pour un horodatage, « 12 juin 2026 » pour une
 * date calendaire (début de campagne). L'heure distingue deux analyses du même jour.
 */
export function formaterMoment({ date }: { date: string }): string {
  if (!date.includes('T')) {
    return formaterDate({ date });
  }
  const heure = new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
  return `${formaterDate({ date })} à ${heure}`;
}

/** Date lisible : « 12 juin 2026 ». */
export function formaterDate({ date }: { date: string }): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}
