'use client';

import { useEffect, useRef } from 'react';

interface GrilleCouleursProps {
  largeur: number;
  hauteur: number;
  /** Couleur CSS de chaque cellule, ligne par ligne ; `null` = transparent. */
  couleurs: readonly (string | null)[];
  libelle: string;
}

/**
 * Dessine une grille de pixels colorés (raster) dans un canvas, agrandie sans lissage
 * pour garder des pixels nets.
 */
export function GrilleCouleurs({ largeur, hauteur, couleurs, libelle }: GrilleCouleursProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const contexte = canvas.current?.getContext('2d');
    if (!contexte) {
      return;
    }
    contexte.clearRect(0, 0, largeur, hauteur);
    couleurs.forEach((couleur, index) => {
      if (couleur) {
        contexte.fillStyle = couleur;
        contexte.fillRect(index % largeur, Math.floor(index / largeur), 1, 1);
      }
    });
  }, [largeur, hauteur, couleurs]);

  return (
    <canvas
      ref={canvas}
      width={largeur}
      height={hauteur}
      role="img"
      aria-label={libelle}
      className="w-full rounded border border-neutral-200 bg-[repeating-conic-gradient(#f5f5f5_0_25%,#fff_0_50%)] bg-[length:12px_12px]"
      style={{ imageRendering: 'pixelated', aspectRatio: `${largeur} / ${hauteur}` }}
    />
  );
}
