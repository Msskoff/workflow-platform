'use client';

import { useReactFlow, type NodeProps } from '@xyflow/react';
import { couleursCategorie, type NoeudEditeur } from '@/lib/editeur/graphe-editeur';
import { BadgeStatutNoeud } from './badge-statut-noeud';
import { ChampParametre, type SchemaParametre } from './champ-parametre';
import { PortNoeud } from './port-noeud';

const BORDURES_STATUT = {
  en_attente: 'border-neutral-300',
  en_cours: 'border-blue-500 ring-2 ring-blue-200',
  ok: 'border-emerald-500',
  erreur: 'border-red-500 ring-2 ring-red-200',
} as const;

/** Nœud de workflow dans React Flow : catégorie, statut d'exécution, ports et paramètres. */
export function NoeudWorkflow({ id, data, selected }: NodeProps<NoeudEditeur>) {
  const { updateNodeData } = useReactFlow<NoeudEditeur>();
  const { descripteur, parametres, etat } = data;
  const proprietes = (descripteur.parametres.properties ?? {}) as Record<string, SchemaParametre>;
  const parametresNumeriques = Object.entries(proprietes).filter(
    ([, schema]) => schema.type === 'number' || schema.type === 'integer',
  );
  const bordure = etat ? BORDURES_STATUT[etat.statut] : 'border-neutral-300';

  return (
    <div
      className={`w-64 rounded-lg border-2 bg-white shadow-sm ${bordure} ${selected ? 'shadow-lg' : ''}`}
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

      {parametresNumeriques.length > 0 && (
        <div className="space-y-1 border-t border-neutral-100 px-3 py-2">
          {parametresNumeriques.map(([nom, schema]) => (
            <ChampParametre
              key={nom}
              nom={nom}
              schema={schema}
              valeur={parametres[nom]}
              surChangement={({ valeur }) =>
                updateNodeData(id, { parametres: { ...parametres, [nom]: valeur } })
              }
            />
          ))}
        </div>
      )}

      {etat?.statut === 'erreur' && etat.erreur && (
        <p className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
