import {
  schemaDuType,
  trierTopologiquement,
  type ErreurWorkflow,
  type GrapheWorkflow,
  type NodeDefinition,
  type PortsDefinition,
  type TypeDonnee,
  type ValeurDonnee,
  type ValeursPorts,
  type RessourcesExecution,
} from '@workflow/shared';
import type { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { validerWorkflowComplet } from './valider-workflow';

/** Valeurs portées par les ports d'un nœud, indexées par nom de port. */
export type ValeursParPort = Record<string, ValeurDonnee<TypeDonnee>>;

/** Levée avant toute exécution si le workflow n'est pas valide. */
export class WorkflowInvalideErreur extends Error {
  readonly erreurs: ErreurWorkflow[];

  constructor({ erreurs }: { erreurs: ErreurWorkflow[] }) {
    super(`Workflow invalide : ${erreurs.map((erreur) => erreur.message).join(' ; ')}`);
    this.erreurs = erreurs;
  }
}

/** Reçoit les changements d'état des nœuds (ex. pour les enregistrer en base). */
export interface ObservateurExecution {
  noeudDemarre(params: { noeudId: string }): Promise<void>;
  noeudTermine(params: { noeudId: string; sorties: ValeursParPort }): Promise<void>;
  noeudEchoue(params: { noeudId: string; erreur: string }): Promise<void>;
}

export type ResultatExecution =
  | { statut: 'ok'; sorties: Record<string, ValeursParPort> }
  | { statut: 'erreur'; noeudId: string; erreur: string };

interface ExecuterWorkflowParams {
  graphe: Pick<GrapheWorkflow, 'noeuds' | 'connexions'>;
  registre: RegistreNoeuds;
  contexte: { executionId: string; campagneId: string; ressources?: RessourcesExecution };
  observateur: ObservateurExecution;
}

interface RassemblerEntreesParams {
  graphe: ExecuterWorkflowParams['graphe'];
  noeudId: string;
  definition: NodeDefinition;
  sorties: ReadonlyMap<string, ValeursParPort>;
}

/** Valeurs reçues par un nœud : un tableau pour chaque entrée `multiple`. */
type ValeursEntrees = Record<string, ValeurDonnee<TypeDonnee> | ValeurDonnee<TypeDonnee>[]>;

/**
 * Entrées d'un nœud : sorties des nœuds amont, revalidées selon le type du port.
 * Une entrée `multiple` reçoit les valeurs de toutes ses connexions, dans leur ordre.
 */
function rassemblerEntrees({
  graphe,
  noeudId,
  definition,
  sorties,
}: RassemblerEntreesParams): ValeursEntrees {
  const entrees: ValeursEntrees = {};
  for (const [nomPort, port] of Object.entries(definition.entrees)) {
    const valeurs = graphe.connexions
      .filter((candidate) => candidate.cible === noeudId && candidate.ciblePort === nomPort)
      .map((connexion) => sorties.get(connexion.source)?.[connexion.sourcePort])
      .filter((valeur) => valeur !== undefined);
    if (valeurs.length === 0) {
      if (port.optionnel) {
        continue;
      }
      throw new Error(`Entrée « ${port.libelle} » sans valeur`);
    }
    const valides = valeurs.map((valeur) => {
      const resultat = schemaDuType({ type: port.type }).safeParse(valeur);
      if (!resultat.success) {
        throw new Error(`Entrée « ${port.libelle} » : valeur non conforme au type ${port.type}`);
      }
      return resultat.data;
    });
    const [premiere] = valides;
    if (port.multiple) {
      entrees[nomPort] = valides;
    } else if (premiere !== undefined) {
      entrees[nomPort] = premiere;
    }
  }
  return entrees;
}

interface ValiderSortiesParams {
  definition: NodeDefinition;
  produit: Record<string, unknown>;
}

/** Chaque port de sortie déclaré doit être produit, avec une valeur du bon type. */
function validerSorties({ definition, produit }: ValiderSortiesParams): ValeursParPort {
  const sorties: ValeursParPort = {};
  for (const [nomPort, port] of Object.entries(definition.sorties)) {
    const resultat = schemaDuType({ type: port.type }).safeParse(produit[nomPort]);
    if (!resultat.success) {
      throw new Error(`Sortie « ${port.libelle} » absente ou non conforme au type ${port.type}`);
    }
    sorties[nomPort] = resultat.data;
  }
  return sorties;
}

/**
 * Exécute un workflow : validation, tri topologique, puis exécution séquentielle.
 * La sortie de chaque nœud alimente les entrées des nœuds connectés en aval.
 * S'arrête au premier nœud en erreur ; les nœuds suivants ne sont pas exécutés.
 * Le moteur ne connaît aucun nœud en particulier : tout passe par le registre.
 */
export async function executerWorkflow({
  graphe,
  registre,
  contexte,
  observateur,
}: ExecuterWorkflowParams): Promise<ResultatExecution> {
  const erreurs = validerWorkflowComplet({ graphe, registre });
  if (erreurs.length > 0) {
    throw new WorkflowInvalideErreur({ erreurs });
  }

  const tri = trierTopologiquement({ graphe });
  if (!tri.ok) {
    throw new WorkflowInvalideErreur({
      erreurs: [{ code: 'cycle', message: `Cycle entre : ${tri.noeudsEnCycle.join(', ')}` }],
    });
  }

  const noeudsParId = new Map(graphe.noeuds.map((noeud) => [noeud.id, noeud]));
  const sorties = new Map<string, ValeursParPort>();

  for (const noeudId of tri.ordre) {
    const noeud = noeudsParId.get(noeudId);
    const definition = noeud && registre.obtenir({ type: noeud.type });
    if (!noeud || !definition) {
      throw new Error(`Nœud ${noeudId} introuvable après validation`);
    }

    await observateur.noeudDemarre({ noeudId });
    try {
      const inputs = rassemblerEntrees({ graphe, noeudId, definition, sorties });
      const params: unknown = definition.parametres.parse(noeud.parametres);
      const produit = await definition.run({
        // Le registre ne connaît les ports qu'à l'exécution : le typage précis (tableau pour
        // une entrée `multiple`) est garanti par `rassemblerEntrees`, qui valide chaque valeur.
        inputs: inputs as ValeursPorts<PortsDefinition>,
        params,
        context: { ...contexte, noeudId },
      });
      const valides = validerSorties({ definition, produit });
      sorties.set(noeudId, valides);
      await observateur.noeudTermine({ noeudId, sorties: valides });
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      await observateur.noeudEchoue({ noeudId, erreur: message });
      return { statut: 'erreur', noeudId, erreur: message };
    }
  }

  return { statut: 'ok', sorties: Object.fromEntries(sorties) };
}
