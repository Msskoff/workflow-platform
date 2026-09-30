'use client';

import { categoriesNoeud, type DescripteurNoeud } from '@workflow/shared';
import { couleursCategorie } from '@/lib/editeur/graphe-editeur';

interface PaletteNoeudsProps {
  descripteurs: readonly DescripteurNoeud[];
  surAjout: (params: { descripteur: DescripteurNoeud }) => void;
}

/** Catalogue des nœuds disponibles, regroupés par catégorie ; un clic ajoute le nœud. */
export function PaletteNoeuds({ descripteurs, surAjout }: PaletteNoeudsProps) {
  return (
    <section className="space-y-4" aria-label="Nœuds">
      <h2 className="text-sm font-semibold">Nœuds</h2>
      {categoriesNoeud.map((categorie) => {
        const duGroupe = descripteurs.filter((descripteur) => descripteur.categorie === categorie);
        if (duGroupe.length === 0) {
          return null;
        }
        return (
          <section key={categorie} className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-500">
              <span className={`h-2 w-2 rounded-full ${couleursCategorie[categorie]}`} />
              {categorie}
            </h3>
            {duGroupe.map((descripteur) => (
              <button
                key={descripteur.id}
                type="button"
                onClick={() => surAjout({ descripteur })}
                className="w-full rounded border border-neutral-200 px-2 py-1.5 text-left hover:border-neutral-400 hover:bg-neutral-50"
                title={descripteur.description}
              >
                <div className="text-sm font-medium">{descripteur.libelle}</div>
                <div className="text-[11px] text-neutral-500">{descripteur.description}</div>
              </button>
            ))}
          </section>
        );
      })}
    </section>
  );
}
