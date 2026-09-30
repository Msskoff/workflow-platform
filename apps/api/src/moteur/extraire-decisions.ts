import {
  indicateursSchema,
  libelleIndicateur,
  resultatReglesSchema,
  type ConnexionWorkflow,
  type GrapheWorkflow,
  type PrioriteDecision,
} from '@workflow/shared';
import type { RegistreNoeuds } from '../noeuds/registre-noeuds';
import type { ValeursParPort } from './moteur-execution';

/** Décision prête à être enregistrée en brouillon, avec sa traçabilité. */
export interface DecisionAEnregistrer {
  /** Nœuds qui ont produit la décision : amont de l'indicateur, source, nœud de règles. */
  noeudIds: string[];
  explication: string;
  recommandation: string;
  priorite: PrioriteDecision;
  /** Données qui ont motivé la décision. */
  donnees: {
    regleId: string;
    regleNom: string;
    indicateur: string;
    libelleIndicateur: string;
    valeur: number;
    operateur: string;
    seuil: number;
    source: { noeudId: string; port: string } | null;
  };
}

type Graphe = Pick<GrapheWorkflow, 'noeuds' | 'connexions'>;

/** Tous les nœuds en amont d'un nœud (lui exclu), dans l'ordre de déclaration du graphe. */
function ancetres({ graphe, noeudId }: { graphe: Graphe; noeudId: string }): string[] {
  const trouves = new Set<string>();
  const aVisiter = [noeudId];
  for (let courant = aVisiter.pop(); courant !== undefined; courant = aVisiter.pop()) {
    for (const connexion of graphe.connexions) {
      if (connexion.cible === courant && !trouves.has(connexion.source)) {
        trouves.add(connexion.source);
        aVisiter.push(connexion.source);
      }
    }
  }
  return graphe.noeuds.map((noeud) => noeud.id).filter((id) => trouves.has(id));
}

interface TrouverSourceParams {
  connexionsEntrantes: readonly ConnexionWorkflow[];
  sorties: Readonly<Record<string, ValeursParPort>>;
  cle: string;
}

/**
 * Connexion qui a fourni l'indicateur : la dernière (fusion « la dernière l'emporte »)
 * dont la sortie contient la clé.
 */
function trouverSource({
  connexionsEntrantes,
  sorties,
  cle,
}: TrouverSourceParams): ConnexionWorkflow | null {
  const candidates = connexionsEntrantes.filter((connexion) => {
    const indicateurs = indicateursSchema.safeParse(
      sorties[connexion.source]?.[connexion.sourcePort],
    );
    return indicateurs.success && cle in indicateurs.data;
  });
  return candidates[candidates.length - 1] ?? null;
}

interface ExtraireDecisionsParams {
  graphe: Graphe;
  registre: RegistreNoeuds;
  /** Sorties de tous les nœuds, après une exécution réussie. */
  sorties: Readonly<Record<string, ValeursParPort>>;
}

/**
 * Décisions produites par les nœuds qui ont une sortie de type `decisions` : une par règle
 * déclenchée, avec le « pourquoi » (explication), les données qui l'ont motivée, et la
 * chaîne des nœuds qui l'ont produite (traçabilité).
 */
export function extraireDecisions({
  graphe,
  registre,
  sorties,
}: ExtraireDecisionsParams): DecisionAEnregistrer[] {
  const decisions: DecisionAEnregistrer[] = [];

  for (const noeud of graphe.noeuds) {
    const definition = registre.obtenir({ type: noeud.type });
    if (!definition) {
      continue;
    }
    const portsIndicateurs = Object.entries(definition.entrees)
      .filter(([, port]) => port.type === 'indicateurs')
      .map(([nom]) => nom);
    const connexionsEntrantes = graphe.connexions.filter(
      (connexion) => connexion.cible === noeud.id && portsIndicateurs.includes(connexion.ciblePort),
    );

    for (const [nomPort, port] of Object.entries(definition.sorties)) {
      if (port.type !== 'decisions') {
        continue;
      }
      const resultat = resultatReglesSchema.safeParse(sorties[noeud.id]?.[nomPort]);
      if (!resultat.success) {
        continue;
      }
      for (const declenchee of resultat.data.declenchees) {
        const source = trouverSource({
          connexionsEntrantes,
          sorties,
          cle: declenchee.motif.indicateur,
        });
        const amont = source
          ? [...ancetres({ graphe, noeudId: source.source }), source.source]
          : [];
        decisions.push({
          noeudIds: [...new Set([...amont, noeud.id])],
          explication: declenchee.explication,
          recommandation: declenchee.recommandation,
          priorite: declenchee.priorite,
          donnees: {
            regleId: declenchee.regleId,
            regleNom: declenchee.regleNom,
            indicateur: declenchee.motif.indicateur,
            libelleIndicateur: libelleIndicateur({ cle: declenchee.motif.indicateur }),
            valeur: declenchee.motif.valeur,
            operateur: declenchee.motif.operateur,
            seuil: declenchee.motif.seuil,
            source: source ? { noeudId: source.source, port: source.sourcePort } : null,
          },
        });
      }
    }
  }
  return decisions;
}
