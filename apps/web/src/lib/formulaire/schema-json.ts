/**
 * Sous-ensemble du JSON Schema produit par `z.toJSONSchema` pour les paramètres des nœuds,
 * avec les métadonnées d'interface ajoutées par `.meta()` (`widget`, `libelles`…).
 */
export interface SchemaJson {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  enum?: readonly (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  maxItems?: number;
  properties?: Record<string, SchemaJson>;
  required?: readonly string[];
  items?: SchemaJson;
  /** Champ spécialisé ; `masque` = non affiché (renseigné par un autre champ). */
  widget?: 'masque' | 'texte-long' | 'fichier-texte' | 'photos';
  /** Types de fichiers acceptés par `fichier-texte`. */
  accept?: string;
  /** Champ voisin qui reçoit le nom du fichier chargé par `fichier-texte`. */
  champNomFichier?: string;
  /** Libellés affichés pour les valeurs d'un `enum`. */
  libelles?: Record<string, string>;
}

export type ValeursObjet = Record<string, unknown>;

export function libelleChamp({ nom, schema }: { nom: string; schema: SchemaJson }): string {
  return schema.title ?? nom;
}

export function libelleOption({
  schema,
  valeur,
}: {
  schema: SchemaJson;
  valeur: string | number;
}): string {
  return schema.libelles?.[String(valeur)] ?? (String(valeur) || '—');
}

/** Valeur d'un nouvel élément : défaut du schéma, sinon valeur vide selon le type. */
export function valeurInitiale({ schema }: { schema: SchemaJson }): unknown {
  if (schema.default !== undefined && !(schema.type === 'object' && isObjetVide(schema.default))) {
    return structuredClone(schema.default);
  }
  switch (schema.type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(schema.properties ?? {})
          .map(([nom, propriete]) => [nom, valeurInitiale({ schema: propriete })] as const)
          .filter(([, valeur]) => valeur !== undefined),
      );
    case 'array':
      return [];
    case 'string':
      return schema.enum?.[0] ?? '';
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

function isObjetVide(valeur: unknown): boolean {
  return typeof valeur === 'object' && valeur !== null && Object.keys(valeur).length === 0;
}

export function estObjet(valeur: unknown): valeur is ValeursObjet {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/** Copie de l'objet avec la propriété modifiée ; `undefined` supprime la propriété. */
export function avecPropriete({
  objet,
  nom,
  valeur,
}: {
  objet: ValeursObjet;
  nom: string;
  valeur: unknown;
}): ValeursObjet {
  const copie = { ...objet };
  if (valeur === undefined) {
    delete copie[nom];
  } else {
    copie[nom] = valeur;
  }
  return copie;
}
