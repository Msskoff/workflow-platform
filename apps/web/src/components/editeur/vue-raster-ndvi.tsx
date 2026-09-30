'use client';

import type { RasterNdvi } from '@workflow/shared';
import { useMemo } from 'react';
import { couleurNdvi } from '@/lib/cartographie/couleurs';
import { GrilleCouleurs } from './grille-couleurs';

const LEGENDE = [0, 0.2, 0.4, 0.6, 0.8];

interface VueRasterNdviProps {
  raster: RasterNdvi;
}

/** Carte du NDVI par pixel, avec sa légende. */
export function VueRasterNdvi({ raster }: VueRasterNdviProps) {
  const couleurs = useMemo(
    () => raster.valeurs.map((ndvi) => (ndvi === null ? null : couleurNdvi({ ndvi }))),
    [raster.valeurs],
  );
  return (
    <div className="space-y-1">
      <GrilleCouleurs
        largeur={raster.largeur}
        hauteur={raster.hauteur}
        couleurs={couleurs}
        libelle="Carte NDVI de la parcelle"
      />
      <div className="flex items-center justify-between text-[10px] text-neutral-500">
        {LEGENDE.map((ndvi) => (
          <span key={ndvi} className="flex items-center gap-1">
            <span
              className="h-2 w-3 rounded-sm"
              style={{ backgroundColor: couleurNdvi({ ndvi }) }}
            />
            {ndvi.toLocaleString('fr-FR')}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-neutral-500">
        {raster.largeur} × {raster.hauteur} pixels de{' '}
        {raster.surfacePixelM2.toLocaleString('fr-FR')} m² ·{' '}
        <span className="font-mono">{raster.crs}</span>
      </p>
    </div>
  );
}
