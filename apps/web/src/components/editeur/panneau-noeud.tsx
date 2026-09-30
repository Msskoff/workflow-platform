'use client';

import type { NoeudWorkflow } from '@workflow/shared';
import {
  FournisseurParametres,
  type IndicateurDisponible,
} from '@/components/parametres/contexte-parametres';
import { GroupeChamps } from '@/components/parametres/groupe-champs';
import { couleursCategorie, type NoeudEditeur } from '@/lib/editeur/graphe-editeur';
import type { SchemaJson } from '@/lib/formulaire/schema-json';
import { ApercuSorties } from './apercu-sorties';
import { BadgeStatutNoeud } from './badge-statut-noeud';

interface PanneauNoeudProps {
  noeud: NoeudEditeur | null;
  /** Indicateurs publiés par les nœuds connectés en entrée (pour l'éditeur de règles). */
  indicateursDisponibles: readonly IndicateurDisponible[];
  surChangementParametres: (params: { parametres: NoeudWorkflow['parametres'] }) => void;
}

/** Panneau latéral : paramètres du nœud sélectionné et résultat de sa dernière exécution. */
export function PanneauNoeud({
  noeud,
  indicateursDisponibles,
  surChangementParametres,
}: PanneauNoeudProps) {
  if (!noeud) {
    return (
      <aside className="w-80 shrink-0 border-l border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        Sélectionnez un nœud pour configurer ses paramètres.
      </aside>
    );
  }

  const { descripteur, parametres, etat } = noeud.data;
  const schema = descripteur.parametres as SchemaJson;
  const aDesParametres = Object.values(schema.properties ?? {}).some(
    (propriete) => propriete.widget !== 'masque',
  );

  return (
    <aside
      className="w-80 shrink-0 space-y-4 overflow-y-auto border-l border-neutral-200 bg-white p-4"
      data-panneau-noeud={noeud.id}
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${couleursCategorie[descripteur.categorie]}`}
          />
          <h2 className="text-base font-semibold">{descripteur.libelle}</h2>
        </div>
        <p className="text-xs text-neutral-500">
          {descripteur.categorie} · <span className="font-mono">{noeud.id}</span>
        </p>
        <p className="text-xs text-neutral-600">{descripteur.description}</p>
      </header>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Paramètres
        </h3>
        {aDesParametres ? (
          <FournisseurParametres value={{ indicateursDisponibles }}>
            <GroupeChamps
              schema={schema}
              valeur={parametres}
              surChangement={({ valeur }) =>
                surChangementParametres({ parametres: valeur as NoeudWorkflow['parametres'] })
              }
            />
          </FournisseurParametres>
        ) : (
          <p className="text-xs text-neutral-500">Ce nœud n’a pas de paramètre.</p>
        )}
      </section>

      {etat && (
        <section className="space-y-2 border-t border-neutral-100 pt-3">
          <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Dernière exécution <BadgeStatutNoeud statut={etat.statut} />
          </h3>
          <ApercuSorties descripteur={descripteur} etat={etat} />
        </section>
      )}
    </aside>
  );
}
