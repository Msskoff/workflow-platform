import {
  operateursRegle,
  prioritesDecision,
  regleMetierSchema,
  type OperateurRegle,
  type PrioriteDecision,
} from '@workflow/shared';

/** Règle en cours de saisie : peut être incomplète (seuil vide, nom manquant…). */
export interface RegleEditee {
  id: string;
  nom: string;
  active: boolean;
  indicateur: string;
  operateur: OperateurRegle;
  seuil: number | undefined;
  recommandation: string;
  explication: string;
  priorite: PrioriteDecision;
}

export type ErreursRegle = Partial<Record<keyof RegleEditee, string>>;

function texte({ valeur }: { valeur: unknown }): string {
  return typeof valeur === 'string' ? valeur : '';
}

/** Lecture tolérante d'une règle issue des paramètres (valeurs manquantes → valeurs vides). */
export function versRegleEditee({ valeur, rang }: { valeur: unknown; rang: number }): RegleEditee {
  const brute =
    typeof valeur === 'object' && valeur !== null ? (valeur as Record<string, unknown>) : {};
  return {
    id: texte({ valeur: brute.id }) || `regle-${rang + 1}`,
    nom: texte({ valeur: brute.nom }),
    active: brute.active !== false,
    indicateur: texte({ valeur: brute.indicateur }),
    operateur: operateursRegle.find((operateur) => operateur === brute.operateur) ?? '<',
    seuil: typeof brute.seuil === 'number' ? brute.seuil : undefined,
    recommandation: texte({ valeur: brute.recommandation }),
    explication: texte({ valeur: brute.explication }),
    priorite: prioritesDecision.find((priorite) => priorite === brute.priorite) ?? 'normale',
  };
}

/** Règle vierge, sur le premier indicateur disponible. */
export function nouvelleRegle({ indicateur }: { indicateur: string }): RegleEditee {
  return {
    id: `regle-${Date.now().toString(36)}`,
    nom: '',
    active: true,
    indicateur,
    operateur: '<',
    seuil: undefined,
    recommandation: '',
    explication: 'La valeur de {indicateur} ({valeur}) a franchi le seuil de {seuil}.',
    priorite: 'normale',
  };
}

/** Erreurs de saisie par champ, d'après le schéma partagé avec le serveur. */
export function erreursRegle({ regle }: { regle: RegleEditee }): ErreursRegle {
  const resultat = regleMetierSchema.safeParse(regle);
  if (resultat.success) {
    return {};
  }
  const erreurs: ErreursRegle = {};
  for (const issue of resultat.error.issues) {
    const champ = issue.path[0] as keyof RegleEditee | undefined;
    if (champ && !erreurs[champ]) {
      erreurs[champ] = champ === 'seuil' ? 'Le seuil doit être un nombre' : issue.message;
    }
  }
  return erreurs;
}
