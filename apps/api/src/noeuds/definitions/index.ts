import type { NodeDefinition } from '@workflow/shared';
import { noeudFacticeNombre } from './factice-nombre.noeud';
import { noeudFacticeSeuil } from './factice-seuil.noeud';

/**
 * Nœuds disponibles. Ajouter un nœud = créer son module `*.noeud.ts` dans ce dossier
 * et l'ajouter à cette liste. Le moteur n'a pas à être modifié.
 */
export const definitionsNoeuds: readonly NodeDefinition[] = [noeudFacticeNombre, noeudFacticeSeuil];
