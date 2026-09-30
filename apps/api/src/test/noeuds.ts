import type { NodeDefinition, PortsDefinition, ValeursPorts } from '@workflow/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { z } from 'zod';

const DOSSIER_EXEMPLES = resolve(__dirname, '../../exemples');

/** Contenu texte d'un fichier du jeu de données d'exemple (`apps/api/exemples`). */
export function lireExemple({ nom }: { nom: string }): string {
  return readFileSync(resolve(DOSSIER_EXEMPLES, nom), 'utf8');
}

/** Fichier binaire du jeu de données d'exemple, encodé en base64 (comme l'envoie l'éditeur). */
export function lireExempleBase64({ nom }: { nom: string }): string {
  return readFileSync(resolve(DOSSIER_EXEMPLES, nom)).toString('base64');
}

/** Fichier JSON du jeu de données d'exemple. */
export function lireExempleJson({ nom }: { nom: string }): unknown {
  return JSON.parse(lireExemple({ nom }));
}

interface ExecuterNoeudParams<
  Entrees extends PortsDefinition,
  Sorties extends PortsDefinition,
  SchemaParametres extends z.ZodType,
> {
  definition: NodeDefinition<Entrees, Sorties, SchemaParametres>;
  inputs?: ValeursPorts<Entrees>;
  /** Paramètres bruts, validés et complétés par le schéma du nœud comme le fait le moteur. */
  params?: unknown;
}

/** Exécute un nœud seul, hors moteur, avec un contexte de test. */
export function executerNoeud<
  Entrees extends PortsDefinition,
  Sorties extends PortsDefinition,
  SchemaParametres extends z.ZodType,
>({
  definition,
  inputs,
  params = {},
}: ExecuterNoeudParams<Entrees, Sorties, SchemaParametres>): Promise<ValeursPorts<Sorties>> {
  return definition.run({
    inputs: inputs ?? ({} as ValeursPorts<Entrees>),
    params: definition.parametres.parse(params),
    context: { executionId: 'test', campagneId: 'test', noeudId: definition.id },
  });
}
