import { z } from 'zod';
import type { ConnexionWorkflow, NoeudWorkflow } from '../domaine/workflow-snapshot';
import { estAtteignable } from './graphe';
import type { PortsDefinition } from './node-definition';
import { typesCompatibles, typesDonnees } from './types-donnees';

export const codesErreurWorkflow = [
  'type_inconnu',
  'port_inconnu',
  'boucle',
  'types_incompatibles',
  'entree_deja_connectee',
  'cycle',
  'entree_obligatoire_manquante',
  'parametres_invalides',
] as const;

export const erreurWorkflowSchema = z.object({
  code: z.enum(codesErreurWorkflow),
  message: z.string(),
  noeudId: z.string().optional(),
  connexionId: z.string().optional(),
});

export type ErreurWorkflow = z.infer<typeof erreurWorkflowSchema>;

/**
 * Ce que la validation doit savoir d'un type de nœud : ses ports.
 * Satisfait à la fois par les NodeDefinition (serveur) et les descripteurs (éditeur).
 */
export interface SignatureNoeud {
  libelle: string;
  entrees: PortsDefinition;
  sorties: PortsDefinition;
}

/** Signatures des types de nœuds disponibles, indexées par identifiant de type. */
export type CatalogueNoeuds = Readonly<Record<string, SignatureNoeud>>;

interface GrapheAValider {
  noeuds: readonly Pick<NoeudWorkflow, 'id' | 'type'>[];
  connexions: readonly ConnexionWorkflow[];
}

export type ResultatConnexion = { ok: true } | { ok: false; erreur: ErreurWorkflow };

interface PeutConnecterParams {
  graphe: GrapheAValider;
  catalogue: CatalogueNoeuds;
  /** Connexion proposée ; `id` facultatif tant qu'elle n'est pas créée. */
  connexion: Omit<ConnexionWorkflow, 'id'> & { id?: string };
}

/**
 * Indique si une connexion peut être ajoutée au graphe : ports existants, types compatibles,
 * entrée libre, pas de boucle ni de cycle. Utilisée par l'éditeur (connexion refusée)
 * et par le serveur (via `validerWorkflow`).
 */
export function peutConnecter({
  graphe,
  catalogue,
  connexion,
}: PeutConnecterParams): ResultatConnexion {
  const { source, sourcePort, cible, ciblePort } = connexion;
  const refus = (erreur: Omit<ErreurWorkflow, 'connexionId'>): ResultatConnexion => ({
    ok: false,
    erreur: { ...erreur, ...(connexion.id !== undefined && { connexionId: connexion.id }) },
  });

  if (source === cible) {
    return refus({ code: 'boucle', message: 'Un nœud ne peut pas être connecté à lui-même' });
  }

  const noeudSource = graphe.noeuds.find((noeud) => noeud.id === source);
  const noeudCible = graphe.noeuds.find((noeud) => noeud.id === cible);
  const signatureSource = noeudSource && catalogue[noeudSource.type];
  const signatureCible = noeudCible && catalogue[noeudCible.type];
  if (!signatureSource || !signatureCible) {
    return refus({ code: 'type_inconnu', message: 'Nœud ou type de nœud inconnu' });
  }

  const portSource = signatureSource.sorties[sourcePort];
  const portCible = signatureCible.entrees[ciblePort];
  if (!portSource || !portCible) {
    return refus({
      code: 'port_inconnu',
      message: `Port inconnu : ${portSource ? `entrée « ${ciblePort} »` : `sortie « ${sourcePort} »`}`,
    });
  }

  if (!typesCompatibles({ source: portSource.type, cible: portCible.type })) {
    return refus({
      code: 'types_incompatibles',
      noeudId: cible,
      message: `Types incompatibles : ${typesDonnees[portSource.type].libelle} → ${typesDonnees[portCible.type].libelle} (${signatureSource.libelle}.${portSource.libelle} → ${signatureCible.libelle}.${portCible.libelle})`,
    });
  }

  // Une entrée simple n'accepte qu'une connexion ; une entrée `multiple` en accepte
  // plusieurs, mais pas deux fois la même sortie.
  const entreeOccupee = graphe.connexions.some(
    (existante) =>
      existante.cible === cible &&
      existante.ciblePort === ciblePort &&
      existante.id !== connexion.id &&
      (!portCible.multiple || (existante.source === source && existante.sourcePort === sourcePort)),
  );
  if (entreeOccupee) {
    return refus({
      code: 'entree_deja_connectee',
      noeudId: cible,
      message: `L'entrée « ${portCible.libelle} » de ${signatureCible.libelle} est déjà connectée`,
    });
  }

  if (estAtteignable({ graphe, depuis: cible, vers: source })) {
    return refus({ code: 'cycle', message: 'Cette connexion créerait un cycle' });
  }

  return { ok: true };
}

interface ValiderWorkflowParams {
  graphe: GrapheAValider;
  catalogue: CatalogueNoeuds;
}

/**
 * Valide la structure d'un workflow par rapport au catalogue : types de nœuds connus,
 * connexions valides (voir `peutConnecter`), entrées obligatoires connectées.
 * Renvoie la liste des erreurs, vide si le workflow est exécutable.
 * Les paramètres, qui demandent les schémas Zod des nœuds, sont vérifiés côté serveur.
 */
export function validerWorkflow({ graphe, catalogue }: ValiderWorkflowParams): ErreurWorkflow[] {
  const erreurs: ErreurWorkflow[] = [];

  const noeudsConnus = graphe.noeuds.filter((noeud) => {
    const connu = catalogue[noeud.type] !== undefined;
    if (!connu) {
      erreurs.push({
        code: 'type_inconnu',
        noeudId: noeud.id,
        message: `Type de nœud inconnu : ${noeud.type}`,
      });
    }
    return connu;
  });
  const idsConnus = new Set(noeudsConnus.map((noeud) => noeud.id));

  // Ajout progressif : chaque connexion est validée contre celles déjà acceptées.
  const acceptees: ConnexionWorkflow[] = [];
  for (const connexion of graphe.connexions) {
    if (!idsConnus.has(connexion.source) || !idsConnus.has(connexion.cible)) {
      continue;
    }
    const resultat = peutConnecter({
      graphe: { noeuds: graphe.noeuds, connexions: acceptees },
      catalogue,
      connexion,
    });
    if (resultat.ok) {
      acceptees.push(connexion);
    } else {
      erreurs.push(resultat.erreur);
    }
  }

  for (const noeud of noeudsConnus) {
    const signature = catalogue[noeud.type];
    for (const [nomPort, port] of Object.entries(signature?.entrees ?? {})) {
      const connectee = acceptees.some(
        (connexion) => connexion.cible === noeud.id && connexion.ciblePort === nomPort,
      );
      if (!connectee && !port.optionnel) {
        erreurs.push({
          code: 'entree_obligatoire_manquante',
          noeudId: noeud.id,
          message: `${noeud.id} : l'entrée « ${port.libelle} » doit être connectée`,
        });
      }
    }
  }

  return erreurs;
}
