import { defineNode, systemesCoordonnees, type CodeCrs } from '@workflow/shared';
import { z } from 'zod';
import { reprojeter } from '../../geo/projections';

const INTRODUCTION_PAR_DEFAUT =
  'Voici le bilan de votre parcelle, établi à partir de son contour GPS et d’une image satellite. ' +
  'Nous y avons repéré des zones plus ou moins vigoureuses et en tirons quelques recommandations simples, ' +
  'chacune expliquée.';

/**
 * Rapport PDF : fige le contenu du rapport client (carte des zones, indicateurs, devis).
 * Le PDF est produit à la demande avec les décisions de cette exécution une fois validées
 * (aperçu interne) ou envoyées (espace client) : les décisions ne sont jamais montrées
 * au client avant leur revue.
 */
export const noeudRapportPdf = defineNode({
  id: 'restitution.rapport_pdf',
  categorie: 'restitution',
  libelle: 'Rapport PDF',
  description:
    'Rapport client en langage simple : carte des zones, décisions validées et leur pourquoi, actions, devis.',
  entrees: {
    geometrie: { type: 'geometrie', libelle: 'Parcelle', optionnel: true },
    zonage: { type: 'zonage', libelle: 'Zones', optionnel: true },
    indicateurs: { type: 'indicateurs', libelle: 'Indicateurs', optionnel: true, multiple: true },
    decisions: { type: 'decisions', libelle: 'Décisions proposées', optionnel: true },
    devis: { type: 'devis', libelle: 'Devis', optionnel: true },
  },
  sorties: {
    rapport: { type: 'rapport_parcelle', libelle: 'Rapport' },
  },
  parametres: z.object({
    titre: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .default('Diagnostic de votre parcelle')
      .meta({ title: 'Titre' }),
    introduction: z
      .string()
      .trim()
      .max(1200)
      .default(INTRODUCTION_PAR_DEFAUT)
      .meta({ title: 'Introduction', widget: 'texte-long' }),
    nombreMaxDecisions: z.int().min(3).max(5).default(5).meta({
      title: 'Nombre de décisions dans le rapport',
      description: 'Entre 3 et 5, les plus prioritaires parmi celles validées',
    }),
  }),
  run: async ({ inputs, params }) => {
    // La carte est dessinée en mètres : système du zonage, sinon Lambert-93.
    const crs: CodeCrs =
      inputs.zonage?.crs ??
      (inputs.geometrie && systemesCoordonnees[inputs.geometrie.crs].unite === 'metre'
        ? inputs.geometrie.crs
        : 'EPSG:2154');
    const contour = inputs.geometrie
      ? reprojeter({ source: inputs.geometrie, vers: crs }).geometrie
      : null;
    const indicateurs = Object.assign({}, ...(inputs.indicateurs ?? [])) as Record<string, number>;

    return {
      rapport: {
        titre: params.titre,
        introduction: params.introduction,
        nombreMaxDecisions: params.nombreMaxDecisions,
        genereLe: new Date().toISOString(),
        surfaceHa: indicateurs.surfaceHa ?? inputs.devis?.surfaceHa ?? null,
        carte: { crs, contour, zonage: inputs.zonage ?? null },
        indicateurs,
        devis: inputs.devis ?? null,
        decisionsProposees: inputs.decisions?.declenchees.length ?? 0,
      },
    };
  },
});
