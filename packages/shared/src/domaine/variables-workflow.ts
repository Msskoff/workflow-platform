import { z } from 'zod';

/**
 * Variables d'entrée d'un workflow (à la manière des paramètres de graphe SNAP) :
 * le workflow les déclare, ses nœuds les référencent dans leurs paramètres par `${nom}`,
 * et chaque exécution (unitaire ou par lot) leur donne une valeur.
 *
 * - Une valeur qui est exactement `${nom}` est remplacée par la valeur typée (nombre, texte…).
 * - Une référence au milieu d'un texte est interpolée (`Diagnostic du ${dateDebut}`).
 * - Une variable `parcelle` prend par défaut la parcelle de la campagne exécutée.
 */

export const typesVariable = ['texte', 'nombre', 'date', 'parcelle', 'fichier'] as const;

export const typeVariableSchema = z.enum(typesVariable);

export type TypeVariable = z.infer<typeof typeVariableSchema>;

export const libellesTypesVariable: Readonly<Record<TypeVariable, string>> = {
  texte: 'Texte',
  nombre: 'Nombre',
  date: 'Date',
  parcelle: 'Parcelle (renseignée automatiquement)',
  fichier: 'Fichier (image, GPS…)',
};

export const nomVariableSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/,
    'Nom de variable : une lettre puis lettres, chiffres ou _ (40 caractères max)',
  );

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const variableWorkflowSchema = z
  .object({
    nom: nomVariableSchema,
    type: typeVariableSchema,
    libelle: z.string().trim().max(80).default(''),
    obligatoire: z.boolean().default(true),
    /** Valeur utilisée faute de valeur fournie (exécution depuis l'éditeur notamment). */
    valeurParDefaut: z.union([z.string(), z.number()]).nullable().default(null),
  })
  .superRefine((variable, contexte) => {
    const { type, valeurParDefaut: valeur } = variable;
    if (valeur === null) {
      return;
    }
    const probleme =
      (type === 'nombre' && typeof valeur !== 'number' && 'un nombre') ||
      (type === 'date' &&
        (typeof valeur !== 'string' || !DATE_ISO.test(valeur)) &&
        'une date AAAA-MM-JJ') ||
      ((type === 'texte' || type === 'parcelle') && typeof valeur !== 'string' && 'un texte') ||
      (type === 'fichier' && 'aucune (un modèle ne contient jamais de fichier)');
    if (probleme) {
      contexte.addIssue({
        code: 'custom',
        message: `Valeur par défaut de « ${variable.nom} » : ${probleme} attendu(e)`,
        path: ['valeurParDefaut'],
      });
    }
  });

export type VariableWorkflow = z.infer<typeof variableWorkflowSchema>;

/** Valeurs fournies pour les variables à une exécution. */
export const valeursVariablesSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export type ValeursVariables = z.infer<typeof valeursVariablesSchema>;

const MOTIF_REFERENCE = /\$\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
const MOTIF_REFERENCE_SEULE = /^\$\{([a-zA-Z][a-zA-Z0-9_]*)\}$/;

/** `${nom}` : texte d'une référence à une variable. */
export function reference({ nom }: { nom: string }): string {
  return `\${${nom}}`;
}

/** Nom de la variable si la valeur est exactement une référence, sinon `null`. */
export function referenceSeule({ valeur }: { valeur: unknown }): string | null {
  return typeof valeur === 'string' ? (MOTIF_REFERENCE_SEULE.exec(valeur)?.[1] ?? null) : null;
}

/** Noms des variables référencées dans une valeur JSON (à toute profondeur). */
export function referencesDans({ valeur }: { valeur: unknown }): Set<string> {
  const noms = new Set<string>();
  const parcourir = (courante: unknown): void => {
    if (typeof courante === 'string') {
      for (const correspondance of courante.matchAll(MOTIF_REFERENCE)) {
        noms.add(correspondance[1] ?? '');
      }
    } else if (Array.isArray(courante)) {
      courante.forEach(parcourir);
    } else if (typeof courante === 'object' && courante !== null) {
      Object.values(courante).forEach(parcourir);
    }
  };
  parcourir(valeur);
  return noms;
}

/** Paramètres de premier niveau d'un nœud qui contiennent au moins une référence. */
export function champsReferencant({
  parametres,
}: {
  parametres: Record<string, unknown>;
}): string[] {
  return Object.entries(parametres)
    .filter(([, valeur]) => referencesDans({ valeur }).size > 0)
    .map(([nom]) => nom);
}

interface GrapheAVariables {
  noeuds: readonly { id: string; parametres?: Record<string, unknown> }[];
  variables?: readonly VariableWorkflow[];
}

/** Références à des variables non déclarées, et variables déclarées deux fois. */
export function problemesVariables({
  graphe,
}: {
  graphe: GrapheAVariables;
}): { noeudId?: string; message: string }[] {
  const problemes: { noeudId?: string; message: string }[] = [];
  const declarees = new Set<string>();
  for (const variable of graphe.variables ?? []) {
    if (declarees.has(variable.nom)) {
      problemes.push({ message: `Variable déclarée deux fois : ${variable.nom}` });
    }
    declarees.add(variable.nom);
  }
  for (const noeud of graphe.noeuds) {
    for (const nom of referencesDans({ valeur: noeud.parametres ?? {} })) {
      if (!declarees.has(nom)) {
        problemes.push({
          noeudId: noeud.id,
          message: `${noeud.id} : la variable \${${nom}} n'est pas déclarée dans le workflow`,
        });
      }
    }
  }
  return problemes;
}

interface PreparerValeursParams {
  variables: readonly VariableWorkflow[];
  fournies?: ValeursVariables;
  /** Parcelle de la campagne exécutée : valeur par défaut des variables `parcelle`. */
  parcelleId?: string;
}

/**
 * Valeurs finales des variables : fournie, sinon valeur par défaut (ou parcelle de la campagne),
 * converties au type déclaré. Une variable facultative sans valeur reste absente.
 */
export function preparerValeursVariables({
  variables,
  fournies = {},
  parcelleId,
}: PreparerValeursParams): { valeurs: ValeursVariables; erreurs: string[] } {
  const valeurs: ValeursVariables = {};
  const erreurs: string[] = [];
  for (const variable of variables) {
    const nom = variable.nom;
    const brute =
      fournies[nom] ??
      variable.valeurParDefaut ??
      (variable.type === 'parcelle' ? parcelleId : undefined);
    if (brute === undefined || brute === '') {
      if (variable.obligatoire) {
        erreurs.push(`La variable « ${variable.libelle || nom} » (${nom}) est obligatoire`);
      }
      continue;
    }
    if (variable.type === 'nombre') {
      const nombre = typeof brute === 'number' ? brute : Number(String(brute).replace(',', '.'));
      if (!Number.isFinite(nombre)) {
        erreurs.push(`« ${nom} » doit être un nombre (reçu : ${String(brute)})`);
        continue;
      }
      valeurs[nom] = nombre;
    } else if (variable.type === 'date') {
      if (typeof brute !== 'string' || !DATE_ISO.test(brute)) {
        erreurs.push(`« ${nom} » doit être une date AAAA-MM-JJ (reçu : ${String(brute)})`);
        continue;
      }
      valeurs[nom] = brute;
    } else {
      valeurs[nom] = String(brute);
    }
  }
  return { valeurs, erreurs };
}

/** Remplace les références d'une valeur JSON ; `undefined` = paramètre à retirer. */
function resoudreValeur({
  valeur,
  valeurs,
}: {
  valeur: unknown;
  valeurs: ValeursVariables;
}): unknown {
  if (typeof valeur === 'string') {
    const seule = referenceSeule({ valeur });
    if (seule !== null) {
      return valeurs[seule];
    }
    return valeur.replace(MOTIF_REFERENCE, (_texte, nom: string) => String(valeurs[nom] ?? ''));
  }
  if (Array.isArray(valeur)) {
    return valeur.map((element) => resoudreValeur({ valeur: element, valeurs }) ?? null);
  }
  if (typeof valeur === 'object' && valeur !== null) {
    return Object.fromEntries(
      Object.entries(valeur)
        .map(([cle, element]) => [cle, resoudreValeur({ valeur: element, valeurs })] as const)
        .filter(([, element]) => element !== undefined),
    );
  }
  return valeur;
}

/**
 * Paramètres des nœuds avec les références remplacées par les valeurs des variables.
 * Une référence seule à une variable absente retire le paramètre : le nœud prend alors
 * sa valeur par défaut.
 */
export function resoudreParametres<Noeud extends { parametres: Record<string, unknown> }>({
  noeuds,
  valeurs,
}: {
  noeuds: readonly Noeud[];
  valeurs: ValeursVariables;
}): Noeud[] {
  return noeuds.map((noeud) => ({
    ...noeud,
    parametres: resoudreValeur({ valeur: noeud.parametres, valeurs }) as Noeud['parametres'],
  }));
}
