'use client';

import { typesDonnees, type DescripteurNoeud } from '@workflow/shared';
import { Handle, Position } from '@xyflow/react';

type Port = DescripteurNoeud['entrees'][string];

interface PortNoeudProps {
  nom: string;
  port: Port;
  sens: 'entree' | 'sortie';
  /** Valeur produite par la dernière exécution (sorties uniquement). */
  valeur?: unknown;
}

/** Ligne d'un port : poignée React Flow (id = nom du port), libellé et type de données. */
export function PortNoeud({ nom, port, sens, valeur }: PortNoeudProps) {
  const estEntree = sens === 'entree';
  return (
    <div
      className={`relative flex items-center gap-1.5 px-3 py-1 text-xs ${estEntree ? '' : 'flex-row-reverse text-right'}`}
    >
      <Handle
        id={nom}
        type={estEntree ? 'target' : 'source'}
        position={estEntree ? Position.Left : Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-neutral-500"
      />
      <span className="font-medium">
        {port.libelle}
        {port.optionnel ? ' (option)' : ''}
      </span>
      <span className="rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">
        {typesDonnees[port.type].libelle}
      </span>
      {valeur !== undefined && (
        <span className="font-mono text-[10px] text-emerald-700">= {JSON.stringify(valeur)}</span>
      )}
    </div>
  );
}
