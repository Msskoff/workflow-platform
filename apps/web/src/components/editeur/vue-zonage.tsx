'use client';

import type { Zonage } from '@workflow/shared';
import { useMemo } from 'react';
import { couleurZone } from '@/lib/cartographie/couleurs';
import { GrilleCouleurs } from './grille-couleurs';

interface VueZonageProps {
  zonage: Zonage;
}

/** Carte des zones et tableau de leurs statistiques. */
export function VueZonage({ zonage }: VueZonageProps) {
  const total = zonage.zones.length;
  const couleurs = useMemo(
    () => zonage.classes.map((numero) => (numero === null ? null : couleurZone({ numero, total }))),
    [zonage.classes, total],
  );
  return (
    <div className="space-y-2">
      <GrilleCouleurs
        largeur={zonage.largeur}
        hauteur={zonage.hauteur}
        couleurs={couleurs}
        libelle={`Zonage de la parcelle en ${total} zones`}
      />
      <table className="w-full text-xs">
        <thead className="text-left text-[10px] uppercase text-neutral-500">
          <tr>
            <th className="font-medium">Zone</th>
            <th className="text-right font-medium">NDVI moyen</th>
            <th className="text-right font-medium">Surface</th>
            <th className="text-right font-medium">Part</th>
          </tr>
        </thead>
        <tbody>
          {zonage.zones.map((zone) => (
            <tr key={zone.numero} data-zone={zone.numero}>
              <td className="flex items-center gap-1.5 py-0.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: couleurZone({ numero: zone.numero, total }) }}
                />
                {zone.numero}
              </td>
              <td className="text-right font-mono">{zone.ndviMoyen.toLocaleString('fr-FR')}</td>
              <td className="text-right font-mono">{zone.surfaceHa.toLocaleString('fr-FR')} ha</td>
              <td className="text-right font-mono">{zone.partSurface.toLocaleString('fr-FR')} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
