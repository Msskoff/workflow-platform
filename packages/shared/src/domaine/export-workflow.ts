import { z } from 'zod';
import { horodatageSchema, texteCourtSchema } from './commun';
import { modeleWorkflowSchema, type ModeleWorkflow } from './modele-workflow';
import { parametresCultureSchema } from './parametres-culture';
import { grapheWorkflowSchema } from './workflow-snapshot';

/**
 * Export / import d'un workflow en JSON versionné. Le champ `format` identifie le fichier,
 * `version` le schéma : un fichier d'une version inconnue est refusé avec un message explicite.
 * Les nœuds inconnus du catalogue sont signalés par l'API à l'import (elle seule connaît
 * les types de nœuds installés).
 */

export const FORMAT_EXPORT_WORKFLOW = 'workflow-platform/workflow';

export const VERSIONS_EXPORT_WORKFLOW = [1] as const;

export const VERSION_EXPORT_WORKFLOW = 1;

export const exportWorkflowV1Schema = z.object({
  format: z.literal(FORMAT_EXPORT_WORKFLOW),
  version: z.literal(1),
  exporteLe: horodatageSchema,
  workflow: z.object({
    nom: texteCourtSchema,
    description: z.string().max(1000).default(''),
    graphe: grapheWorkflowSchema,
    /** Culture visée, retrouvée par son code à l'import. */
    culture: z.object({ code: z.string(), nom: z.string() }).nullable().default(null),
    parametresDefaut: parametresCultureSchema.nullable().default(null),
  }),
});

export type ExportWorkflow = z.infer<typeof exportWorkflowV1Schema>;

/** Corps de `POST /modeles/import`. */
export const importWorkflowSchema = z.object({
  /** Contenu du fichier JSON, tel quel (validé par `lireExportWorkflow`). */
  contenu: z.unknown(),
  /** Nom du modèle créé, si l'on veut remplacer celui du fichier (ex. doublon). */
  nom: texteCourtSchema.optional(),
});

export type ImportWorkflow = z.infer<typeof importWorkflowSchema>;

/** Export d'un modèle (la culture est référencée par son code). */
export function creerExportWorkflow({
  modele,
  cultureCode,
  exporteLe = new Date().toISOString(),
}: {
  modele: ModeleWorkflow;
  cultureCode: string | null;
  exporteLe?: string;
}): ExportWorkflow {
  return {
    format: FORMAT_EXPORT_WORKFLOW,
    version: VERSION_EXPORT_WORKFLOW,
    exporteLe,
    workflow: {
      nom: modele.nom,
      description: modele.description,
      graphe: modele.graphe,
      culture:
        modele.culture && cultureCode ? { code: cultureCode, nom: modele.culture.nom } : null,
      parametresDefaut: modele.parametresDefaut,
    },
  };
}

export type ResultatLectureExport =
  { ok: true; export: ExportWorkflow } | { ok: false; erreurs: string[] };

/**
 * Valide le contenu d'un fichier d'export : format, version prise en charge, puis schéma.
 * Chaque erreur de schéma indique son chemin (`workflow.graphe.noeuds.2.type : …`).
 */
export function lireExportWorkflow({ contenu }: { contenu: unknown }): ResultatLectureExport {
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) {
    return { ok: false, erreurs: ['Le fichier ne contient pas un objet JSON.'] };
  }
  const { format, version } = contenu as { format?: unknown; version?: unknown };
  if (format !== FORMAT_EXPORT_WORKFLOW) {
    return {
      ok: false,
      erreurs: [
        `Ce fichier n'est pas un export de workflow : champ « format » attendu « ${FORMAT_EXPORT_WORKFLOW} », reçu ${JSON.stringify(format ?? null)}.`,
      ],
    };
  }
  if (!VERSIONS_EXPORT_WORKFLOW.some((acceptee) => acceptee === version)) {
    return {
      ok: false,
      erreurs: [
        `Version d'export ${JSON.stringify(version ?? null)} non prise en charge (versions acceptées : ${VERSIONS_EXPORT_WORKFLOW.join(', ')}).`,
      ],
    };
  }
  const resultat = exportWorkflowV1Schema.safeParse(contenu);
  if (!resultat.success) {
    return {
      ok: false,
      erreurs: resultat.error.issues.map(
        (issue) => `${issue.path.join('.') || 'fichier'} : ${issue.message}`,
      ),
    };
  }
  return { ok: true, export: resultat.data };
}

/** Réponse de `POST /modeles/import` : le modèle créé et les points d'attention éventuels. */
export const resultatImportSchema = z.object({
  modele: modeleWorkflowSchema,
  avertissements: z.array(z.string()),
});

export type ResultatImport = z.infer<typeof resultatImportSchema>;
