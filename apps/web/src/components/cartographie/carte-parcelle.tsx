import {
  bandesZonage,
  calculerCadrage,
  empriseCarte,
  versEcran,
  type CarteParcelle as DonneesCarte,
} from '@workflow/shared';
import { useId } from 'react';
import { couleurZone } from '@/lib/cartographie/couleurs';

interface CarteParcelleProps {
  carte: DonneesCarte;
  /** Texte alternatif de la carte. */
  titre: string;
  /** Taille du dessin en unités SVG (la carte s'adapte ensuite à la largeur disponible). */
  largeur?: number;
  hauteur?: number;
}

/** Anneaux du contour en chemin SVG (règle evenodd : les trous restent vides). */
function cheminContour({
  carte,
  cadrage,
}: {
  carte: DonneesCarte;
  cadrage: ReturnType<typeof calculerCadrage>;
}): string {
  if (!carte.contour) {
    return '';
  }
  const polygones =
    carte.contour.type === 'Polygon' ? [carte.contour.coordinates] : carte.contour.coordinates;
  return polygones
    .flat()
    .map(
      (anneau) =>
        anneau
          .map(([x = 0, y = 0], index) => {
            const point = versEcran({ cadrage, x, y });
            return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
          })
          .join(' ') + ' Z',
    )
    .join(' ');
}

/**
 * Carte d'une parcelle : zones de vigueur colorées, découpées sur le contour.
 * Même dessin que le rapport PDF (même cadrage, mêmes couleurs).
 */
export function CarteParcelle({ carte, titre, largeur = 480, hauteur = 320 }: CarteParcelleProps) {
  const idDecoupe = useId();
  const emprise = empriseCarte({ carte });
  if (!emprise) {
    return (
      <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">
        Carte indisponible pour cette analyse.
      </p>
    );
  }
  const cadrage = calculerCadrage({ emprise, largeur, hauteur, marge: 12 });
  const contour = cheminContour({ carte, cadrage });
  const zonage = carte.zonage;

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      role="img"
      aria-label={titre}
      className="h-auto w-full rounded-lg bg-neutral-50"
    >
      <title>{titre}</title>
      {contour && (
        <defs>
          <clipPath id={idDecoupe}>
            <path d={contour} fillRule="evenodd" />
          </clipPath>
        </defs>
      )}
      {zonage && (
        <g clipPath={contour ? `url(#${idDecoupe})` : undefined} shapeRendering="crispEdges">
          {bandesZonage({ zonage }).map((bande) => {
            const coinHaut = versEcran({
              cadrage,
              x: zonage.origineX + bande.colonneDebut * zonage.resolutionX,
              y: zonage.origineY + bande.ligne * zonage.resolutionY,
            });
            const coinBas = versEcran({
              cadrage,
              x: zonage.origineX + (bande.colonneDebut + bande.longueur) * zonage.resolutionX,
              y: zonage.origineY + (bande.ligne + 1) * zonage.resolutionY,
            });
            return (
              <rect
                key={`${bande.ligne}-${bande.colonneDebut}`}
                x={Math.min(coinHaut.x, coinBas.x)}
                y={Math.min(coinHaut.y, coinBas.y)}
                width={Math.abs(coinBas.x - coinHaut.x) + 0.5}
                height={Math.abs(coinBas.y - coinHaut.y) + 0.5}
                fill={couleurZone({ numero: bande.zone, total: zonage.zones.length })}
              />
            );
          })}
        </g>
      )}
      {contour && (
        <path
          d={contour}
          fillRule="evenodd"
          fill={zonage ? 'none' : 'rgb(220,237,200)'}
          stroke="#1f2937"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
