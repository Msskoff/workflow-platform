import type { NodeDefinition } from '@workflow/shared';
import { noeudControleQualite } from './controle-qualite.noeud';
import { noeudFacticeNombre } from './factice-nombre.noeud';
import { noeudFacticeSeuil } from './factice-seuil.noeud';
import { noeudFormulaireTerrain } from './formulaire-terrain.noeud';
import { noeudImportGps } from './import-gps.noeud';
import { noeudReprojection } from './reprojection.noeud';

/**
 * Nœuds disponibles. Ajouter un nœud = créer son module `*.noeud.ts` dans ce dossier
 * et l'ajouter à cette liste. Le moteur n'a pas à être modifié.
 */
export const definitionsNoeuds: readonly NodeDefinition[] = [
  noeudImportGps,
  noeudFormulaireTerrain,
  noeudReprojection,
  noeudControleQualite,
  noeudFacticeNombre,
  noeudFacticeSeuil,
];
