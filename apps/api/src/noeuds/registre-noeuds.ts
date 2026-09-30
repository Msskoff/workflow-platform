import {
  decrireNoeud,
  type CatalogueNoeuds,
  type DescripteurNoeud,
  type NodeDefinition,
} from '@workflow/shared';
import { definitionsNoeuds } from './definitions';

interface RegistreNoeudsParams {
  definitions: readonly NodeDefinition[];
}

/** Registre des types de nœuds : seul point d'accès du moteur aux définitions. */
export class RegistreNoeuds {
  private readonly definitions: ReadonlyMap<string, NodeDefinition>;

  constructor({ definitions }: RegistreNoeudsParams) {
    const parId = new Map<string, NodeDefinition>();
    for (const definition of definitions) {
      if (parId.has(definition.id)) {
        throw new Error(`Type de nœud déclaré deux fois : ${definition.id}`);
      }
      parId.set(definition.id, definition);
    }
    this.definitions = parId;
  }

  /** Définition d'un type de nœud, ou `undefined` s'il est inconnu. */
  obtenir({ type }: { type: string }): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  /** Signatures (ports) de tous les types, pour `validerWorkflow`. */
  catalogue(): CatalogueNoeuds {
    return Object.fromEntries(this.definitions);
  }

  /** Descripteurs sérialisables, envoyés à l'éditeur. */
  decrire(): DescripteurNoeud[] {
    return [...this.definitions.values()].map((definition) => decrireNoeud({ definition }));
  }
}

/** Registre contenant tous les nœuds déclarés dans `definitions/`. */
export function creerRegistreNoeuds(): RegistreNoeuds {
  return new RegistreNoeuds({ definitions: definitionsNoeuds });
}
