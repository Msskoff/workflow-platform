'use client';

import {
  FORMAT_EXPORT_WORKFLOW,
  VERSION_EXPORT_WORKFLOW,
  type ExportWorkflow,
  type GrapheWorkflow,
  type ModeleWorkflow,
} from '@workflow/shared';
import { useState, type ChangeEvent } from 'react';
import { ErreurApi, importerWorkflow } from '@/lib/api/api-navigateur';

interface ImportExportWorkflowProps {
  /** Nom du workflow ouvert (nom du fichier exporté). */
  nom: string;
  /** Graphe courant, sans les données chargées (fichiers, photos). */
  graphe: GrapheWorkflow;
  surImport: (params: { modele: ModeleWorkflow; avertissements: string[] }) => void;
}

/** Nom de fichier sûr : minuscules, sans accents, tirets. */
function nomFichier({ nom }: { nom: string }): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `workflow-${base || 'sans-nom'}.json`;
}

/**
 * Export du graphe ouvert en JSON versionné (téléchargement) et import d'un fichier exporté,
 * qui devient un nouveau modèle. Les erreurs d'import (version, nœud inconnu…) sont listées.
 */
export function ImportExportWorkflow({ nom, graphe, surImport }: ImportExportWorkflowProps) {
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);

  const exporter = () => {
    const contenu: ExportWorkflow = {
      format: FORMAT_EXPORT_WORKFLOW,
      version: VERSION_EXPORT_WORKFLOW,
      exporteLe: new Date().toISOString(),
      workflow: { nom, description: '', graphe, culture: null, parametresDefaut: null },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' }),
    );
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier({ nom });
    lien.click();
    URL.revokeObjectURL(url);
  };

  const importer = async (evenement: ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = '';
    if (!fichier) {
      return;
    }
    setErreurs([]);
    let contenu: unknown;
    try {
      contenu = JSON.parse(await fichier.text());
    } catch {
      setErreurs([`« ${fichier.name} » n’est pas un fichier JSON lisible.`]);
      return;
    }
    setEnCours(true);
    try {
      surImport(await importerWorkflow({ contenu }));
    } catch (erreur) {
      setErreurs(erreur instanceof ErreurApi ? erreur.details : [String(erreur)]);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section className="space-y-1.5" aria-label="Import et export">
      <h2 className="text-sm font-semibold">Fichier JSON</h2>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={exporter}
          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
        >
          Exporter
        </button>
        <label className="flex-1 cursor-pointer rounded border border-neutral-300 px-2 py-1 text-center text-xs hover:bg-neutral-50">
          {enCours ? 'Import…' : 'Importer'}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            disabled={enCours}
            onChange={(evenement) => void importer(evenement)}
          />
        </label>
      </div>
      {erreurs.length > 0 && (
        <ul className="space-y-0.5 rounded bg-red-50 p-1.5 text-[11px] text-red-700" role="alert">
          {erreurs.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
