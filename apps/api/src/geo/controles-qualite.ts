import kinks from '@turf/kinks';
import {
  calculerSurfaceHa,
  geometrieParcelleSchema,
  type ConstatQualite,
  type FormulaireTerrain,
  type GeometrieGeoreferencee,
} from '@workflow/shared';
import type { MultiPolygon, Polygon } from 'geojson';
import { reprojeter } from './projections';

/** Résultat partiel d'un contrôle, fusionné ensuite dans le rapport qualité. */
export interface ResultatControle {
  erreurs: ConstatQualite[];
  avertissements: ConstatQualite[];
  indicateurs: Record<string, number>;
}

export function resultatVide(): ResultatControle {
  return { erreurs: [], avertissements: [], indicateurs: {} };
}

export function fusionnerResultats({
  resultats,
}: {
  resultats: ResultatControle[];
}): ResultatControle {
  return resultats.reduce<ResultatControle>(
    (total, resultat) => ({
      erreurs: [...total.erreurs, ...resultat.erreurs],
      avertissements: [...total.avertissements, ...resultat.avertissements],
      indicateurs: { ...total.indicateurs, ...resultat.indicateurs },
    }),
    resultatVide(),
  );
}

/** Emprise large de la France métropolitaine et de la Corse, en degrés. */
const EMPRISE_FRANCE = { ouest: -5.8, est: 10.2, sud: 41.2, nord: 51.3 };

function dansFrance({ longitude, latitude }: { longitude: number; latitude: number }): boolean {
  return (
    longitude >= EMPRISE_FRANCE.ouest &&
    longitude <= EMPRISE_FRANCE.est &&
    latitude >= EMPRISE_FRANCE.sud &&
    latitude <= EMPRISE_FRANCE.nord
  );
}

function polygonesDe({ source }: { source: GeometrieGeoreferencee }): number[][][][] {
  return source.geometrie.type === 'Polygon'
    ? [source.geometrie.coordinates]
    : source.geometrie.coordinates;
}

interface ControlerGeometrieParams {
  source: GeometrieGeoreferencee;
  surfaceMinHa: number;
  surfaceMaxHa: number;
}

/**
 * Contrôle d'une géométrie de parcelle : structure des anneaux, coordonnées plausibles
 * (limites WGS84, emprise France), auto-intersections et surface.
 */
export function controlerGeometrie({
  source,
  surfaceMinHa,
  surfaceMaxHa,
}: ControlerGeometrieParams): ResultatControle {
  const resultat = resultatVide();
  const polygones = polygonesDe({ source });
  let structureValide = polygones.length > 0;

  if (polygones.length === 0) {
    resultat.erreurs.push({
      code: 'GEOMETRIE_VIDE',
      message: 'La géométrie ne contient aucun polygone',
      cible: 'geometrie',
    });
  }

  let nombreSommets = 0;
  polygones.forEach((anneaux, indexPolygone) => {
    if (anneaux.length === 0) {
      structureValide = false;
      resultat.erreurs.push({
        code: 'POLYGONE_VIDE',
        message: `Le polygone ${indexPolygone + 1} n'a aucun anneau`,
        cible: `geometrie.polygone[${indexPolygone}]`,
      });
    }
    anneaux.forEach((anneau, indexAnneau) => {
      const cible = `geometrie.polygone[${indexPolygone}].anneau[${indexAnneau}]`;
      const premier = anneau[0];
      const dernier = anneau[anneau.length - 1];
      const ferme =
        premier !== undefined &&
        dernier !== undefined &&
        premier[0] === dernier[0] &&
        premier[1] === dernier[1];
      nombreSommets += ferme ? anneau.length - 1 : anneau.length;

      if (anneau.length < 4) {
        structureValide = false;
        resultat.erreurs.push({
          code: 'ANNEAU_TROP_COURT',
          message: `Anneau de ${anneau.length} positions : il en faut au moins 4 (3 sommets + fermeture)`,
          cible,
        });
        return;
      }
      if (!ferme) {
        structureValide = false;
        resultat.erreurs.push({
          code: 'ANNEAU_NON_FERME',
          message: 'Le dernier point de l’anneau doit être égal au premier',
          cible,
        });
      }
      const doublons = anneau.filter(
        (position, index) =>
          index > 0 &&
          position[0] === anneau[index - 1]?.[0] &&
          position[1] === anneau[index - 1]?.[1],
      ).length;
      if (doublons > 0) {
        resultat.avertissements.push({
          code: 'POINTS_DUPLIQUES',
          message: `${doublons} point(s) répété(s) consécutivement (relevé GPS immobile ?)`,
          cible,
        });
      }
    });
  });
  resultat.indicateurs.nombrePolygones = polygones.length;
  resultat.indicateurs.nombreSommets = nombreSommets;

  if (!structureValide) {
    return resultat;
  }

  // Plausibilité des coordonnées, contrôlée en WGS84 quel que soit le système d'entrée.
  let wgs84: GeometrieGeoreferencee | null = null;
  try {
    wgs84 = reprojeter({ source, vers: 'EPSG:4326' });
  } catch {
    // Coordonnées hors du domaine du système source : signalé ci-dessous.
  }
  const positions = wgs84 ? polygonesDe({ source: wgs84 }).flat(2) : [];
  const horsLimites =
    wgs84 === null ||
    positions.some(
      ([longitude = NaN, latitude = NaN]) =>
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        Math.abs(longitude) > 180 ||
        Math.abs(latitude) > 90,
    );
  if (horsLimites || wgs84 === null) {
    resultat.erreurs.push({
      code: 'COORDONNEES_HORS_LIMITES',
      message: `Coordonnées impossibles en ${source.crs} : vérifiez le système de coordonnées déclaré`,
      cible: 'geometrie',
    });
    return resultat;
  }
  const horsFrance = positions.filter(
    ([longitude = 0, latitude = 0]) => !dansFrance({ longitude, latitude }),
  );
  if (horsFrance.length > 0) {
    const inversion = horsFrance.every(([longitude = 0, latitude = 0]) =>
      dansFrance({ longitude: latitude, latitude: longitude }),
    );
    resultat.avertissements.push({
      code: 'HORS_FRANCE',
      message: inversion
        ? 'Parcelle hors de France : latitude et longitude semblent inversées'
        : `${horsFrance.length} sommet(s) hors de France métropolitaine`,
      cible: 'geometrie',
    });
  }

  const intersections = kinks(source.geometrie as Polygon | MultiPolygon).features;
  const [premiere] = intersections;
  if (premiere) {
    const [x = 0, y = 0] = premiere.geometry.coordinates;
    resultat.erreurs.push({
      code: 'AUTO_INTERSECTION',
      message: `Le contour se recoupe lui-même (${intersections.length} croisement(s), premier vers ${x} ; ${y})`,
      cible: 'geometrie',
    });
    return resultat;
  }

  const geometrieWgs84 = geometrieParcelleSchema.safeParse(wgs84.geometrie);
  if (geometrieWgs84.success) {
    const surfaceHa = calculerSurfaceHa({ geometrie: geometrieWgs84.data });
    resultat.indicateurs.surfaceHa = surfaceHa;
    if (surfaceHa < surfaceMinHa) {
      resultat.erreurs.push({
        code: 'SURFACE_TROP_FAIBLE',
        message: `Surface de ${surfaceHa} ha, inférieure au minimum de ${surfaceMinHa} ha`,
        cible: 'geometrie',
      });
    } else if (surfaceHa > surfaceMaxHa) {
      resultat.avertissements.push({
        code: 'SURFACE_ELEVEE',
        message: `Surface de ${surfaceHa} ha, supérieure au seuil de vigilance de ${surfaceMaxHa} ha`,
        cible: 'geometrie',
      });
    }
  }
  return resultat;
}

/** Contrôle de complétude et de cohérence de la saisie terrain. */
export function controlerFormulaire({
  formulaire,
}: {
  formulaire: FormulaireTerrain;
}): ResultatControle {
  const resultat = resultatVide();
  const { culture, typeSol, irrigation, historique, photos } = formulaire;

  if (culture === null) {
    resultat.erreurs.push({
      code: 'CULTURE_MANQUANTE',
      message: 'La culture en place n’est pas renseignée',
      cible: 'formulaire.culture',
    });
  }
  if (typeSol === null) {
    resultat.avertissements.push({
      code: 'TYPE_SOL_MANQUANT',
      message: 'Le type de sol n’est pas renseigné',
      cible: 'formulaire.typeSol',
    });
  }

  if (irrigation.irriguee === null) {
    resultat.avertissements.push({
      code: 'IRRIGATION_NON_RENSEIGNEE',
      message: 'On ne sait pas si la parcelle est irriguée',
      cible: 'formulaire.irrigation',
    });
  } else if (irrigation.irriguee && irrigation.systeme === null) {
    resultat.avertissements.push({
      code: 'SYSTEME_IRRIGATION_MANQUANT',
      message: 'Parcelle irriguée sans système d’irrigation précisé',
      cible: 'formulaire.irrigation.systeme',
    });
  } else if (
    !irrigation.irriguee &&
    (irrigation.systeme !== null || irrigation.volumeAnnuelM3Ha !== null)
  ) {
    resultat.avertissements.push({
      code: 'IRRIGATION_INCOHERENTE',
      message: 'Parcelle déclarée non irriguée mais un système ou un volume est renseigné',
      cible: 'formulaire.irrigation',
    });
  }

  if (historique.length === 0) {
    resultat.avertissements.push({
      code: 'HISTORIQUE_VIDE',
      message: 'Aucune culture précédente renseignée',
      cible: 'formulaire.historique',
    });
  }
  historique.forEach((entree, index) => {
    if (entree.culture === null) {
      resultat.avertissements.push({
        code: 'HISTORIQUE_INCOMPLET',
        message: `Historique ${entree.annee} : culture non renseignée`,
        cible: `formulaire.historique[${index}].culture`,
      });
    }
  });
  const annees = historique.map((entree) => entree.annee);
  const doublons = [...new Set(annees.filter((annee, index) => annees.indexOf(annee) !== index))];
  if (doublons.length > 0) {
    resultat.avertissements.push({
      code: 'HISTORIQUE_ANNEE_DOUBLON',
      message: `Année(s) saisie(s) plusieurs fois dans l’historique : ${doublons.join(', ')}`,
      cible: 'formulaire.historique',
    });
  }

  if (photos.length === 0) {
    resultat.avertissements.push({
      code: 'AUCUNE_PHOTO',
      message: 'Aucune photo terrain',
      cible: 'formulaire.photos',
    });
  }
  photos.forEach((photo, index) => {
    if (photo.latitude === null || photo.longitude === null) {
      resultat.avertissements.push({
        code: 'PHOTO_NON_GEOLOCALISEE',
        message: `Photo « ${photo.nom} » sans coordonnées`,
        cible: `formulaire.photos[${index}]`,
      });
    }
  });

  resultat.indicateurs.nombrePhotos = photos.length;
  resultat.indicateurs.anneesHistorique = new Set(annees).size;
  return resultat;
}
