'use client';

import type { NodeProps } from '@xyflow/react';
import { couleursCategorie, type NoeudEditeur } from '@/lib/editeur/graphe-editeur';
import { BadgeStatutNoeud } from './badge-statut-noeud';
import { PortNoeud } from './port-noeud';

const BORDURES_STATUT = {
  en_attente: 'border-neutral-300',
  en_cours: 'border-blue-500 ring-2 ring-blue-200',
  ok: 'border-emerald-500',
  erreur: 'border-red-500 ring-2 ring-red-200',
} as const;

/**
 * Nœud de workflow dans React Flow : catégorie, statut d'exécution et ports.
 * Les paramètres se règlent dans le panneau latéral.
 */
export function NoeudWorkflow({ id, data, selected }: NodeProps<NoeudEditeur>) {
  const { descripteur, etat } = data;
  const bordure = etat ? BORDURES_STATUT[etat.statut] : 'border-neutral-300';

  return (
    <div
      className={`w-60 rounded-lg border-2 bg-white shadow-sm ${bordure} ${selected ? 'outline outline-2 outline-offset-2 outline-emerald-600' : ''}`}
      data-noeud-id={id}
    >
      <header
        className={`flex items-center justify-between gap-2 rounded-t-md px-3 py-1.5 text-white ${couleursCategorie[descripteur.categorie]}`}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{descripteur.libelle}</div>
          <div className="text-[10px] uppercase tracking-wide opacity-80">
            {descripteur.categorie} · {id}
          </div>
        </div>
        {etat && <BadgeStatutNoeud statut={etat.statut} />}
      </header>

      <div className="py-1">
        {Object.entries(descripteur.entrees).map(([nom, port]) => (
          <PortNoeud key={nom} nom={nom} port={port} sens="entree" />
        ))}
        {Object.entries(descripteur.sorties).map(([nom, port]) => (
          <PortNoeud
            key={nom}
            nom={nom}
            port={port}
            sens="sortie"
            valeur={etat?.statut === 'ok' ? etat.sorties?.[nom] : undefined}
          />
        ))}
      </div>

      {etat?.statut === 'erreur' && etat.erreur && (
        <p className="line-clamp-3 border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
