import type { NodeDefinition } from '@workflow/shared';
import { noeudContourParcelle } from './contour-parcelle.noeud';
import { noeudControleQualite } from './controle-qualite.noeud';
import { noeudDevis } from './devis.noeud';
import { noeudFacticeNombre } from './factice-nombre.noeud';
import { noeudFacticeSeuil } from './factice-seuil.noeud';
import { noeudFormulaireTerrain } from './formulaire-terrain.noeud';
import { noeudImportGps } from './import-gps.noeud';
import { noeudNdvi } from './ndvi.noeud';
import { noeudRapportPdf } from './rapport-pdf.noeud';
import { noeudReglesMetier } from './regles-metier.noeud';
import { noeudReprojection } from './reprojection.noeud';
import { noeudSurfacePerimetre } from './surface-perimetre.noeud';
import { noeudZonage } from './zonage.noeud';

/**
 * Nœuds disponibles. Ajouter un nœud = créer son module `*.noeud.ts` dans ce dossier
 * et l'ajouter à cette liste. Le moteur n'a pas à être modifié.
 */
export const definitionsNoeuds: readonly NodeDefinition[] = [
  noeudImportGps,
  noeudContourParcelle,
  noeudFormulaireTerrain,
  noeudReprojection,
  noeudControleQualite,
  noeudSurfacePerimetre,
  noeudNdvi,
  noeudZonage,
  noeudReglesMetier,
  noeudDevis,
  noeudRapportPdf,
  noeudFacticeNombre,
  noeudFacticeSeuil,
];
