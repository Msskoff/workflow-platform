import { defineNode, type RapportQualite } from '@workflow/shared';
import { z } from 'zod';
import {
  controlerFormulaire,
  controlerGeometrie,
  fusionnerResultats,
  resultatVide,
  type ResultatControle,
} from '../../geo/controles-qualite';

/**
 * Contrôle qualité : vérifie la géométrie (structure, coordonnées, auto-intersections,
 * surface) et la complétude du formulaire terrain, puis produit un rapport structuré.
 * Par défaut le rapport est transmis même en cas d'erreurs ; le paramètre
 * `bloquerSiErreurs` arrête le workflow à la place.
 */
export const noeudControleQualite = defineNode({
  id: 'standardisation.controle_qualite',
  categorie: 'standardisation',
  libelle: 'Contrôle qualité',
  description: 'Détecte géométrie invalide et données manquantes ; produit un rapport.',
  entrees: {
    geometrie: { type: 'geometrie', libelle: 'Géométrie', optionnel: true },
    formulaire: { type: 'formulaire_terrain', libelle: 'Formulaire', optionnel: true },
  },
  sorties: {
    rapport: { type: 'rapport_qualite', libelle: 'Rapport' },
    conforme: { type: 'booleen', libelle: 'Conforme' },
  },
  parametres: z.object({
    exigerGeometrie: z.boolean().default(true).meta({ title: 'Géométrie obligatoire' }),
    exigerFormulaire: z.boolean().default(true).meta({ title: 'Formulaire obligatoire' }),
    surfaceMinHa: z.number().min(0).default(0.05).meta({ title: 'Surface minimale (ha)' }),
    surfaceMaxHa: z
      .number()
      .positive()
      .default(500)
      .meta({ title: 'Surface de vigilance (ha)', description: 'Au-delà : avertissement' }),
    bloquerSiErreurs: z.boolean().default(false).meta({
      title: 'Arrêter le workflow en cas d’erreur',
      description: 'Sinon le rapport est transmis et la suite du workflow décide',
    }),
  }),
  run: async ({ inputs, params }) => {
    const resultats: ResultatControle[] = [];

    if (inputs.geometrie) {
      resultats.push(
        controlerGeometrie({
          source: inputs.geometrie,
          surfaceMinHa: params.surfaceMinHa,
          surfaceMaxHa: params.surfaceMaxHa,
        }),
      );
    } else if (params.exigerGeometrie) {
      const absente = resultatVide();
      absente.erreurs.push({
        code: 'GEOMETRIE_ABSENTE',
        message: 'Aucune géométrie reçue',
        cible: 'geometrie',
      });
      resultats.push(absente);
    }

    if (inputs.formulaire) {
      resultats.push(controlerFormulaire({ formulaire: inputs.formulaire }));
    } else if (params.exigerFormulaire) {
      const absent = resultatVide();
      absent.erreurs.push({
        code: 'FORMULAIRE_ABSENT',
        message: 'Aucun formulaire terrain reçu',
        cible: 'formulaire',
      });
      resultats.push(absent);
    }

    const { erreurs, avertissements, indicateurs } = fusionnerResultats({ resultats });
    const rapport: RapportQualite = {
      conforme: erreurs.length === 0,
      erreurs,
      avertissements,
      indicateurs,
    };

    if (params.bloquerSiErreurs && !rapport.conforme) {
      throw new Error(
        `Contrôle qualité : ${erreurs.length} erreur(s) : ${erreurs.map((erreur) => erreur.message).join(' ; ')}`,
      );
    }
    return { rapport, conforme: rapport.conforme };
  },
});
