'use client';

import type { ResumeModele } from '@workflow/shared';

interface ListeModelesProps {
  modeles: readonly ResumeModele[];
  /** Modèle en cours de chargement ou actuellement ouvert. */
  modeleActifId: string | null;
  /** Culture de la campagne choisie : ses modèles passent en tête, marqués « recommandé ». */
  cultureRecommandee: { id: string; nom: string } | null;
  chargementEnCours: boolean;
  surChargement: (params: { modele: ResumeModele }) => void;
}

/** Modèles de workflow : un clic remplace le graphe de l'éditeur par celui du modèle. */
export function ListeModeles({
  modeles,
  modeleActifId,
  cultureRecommandee,
  chargementEnCours,
  surChargement,
}: ListeModelesProps) {
  const recommande = (modele: ResumeModele) =>
    cultureRecommandee !== null && modele.culture?.id === cultureRecommandee.id;
  // Tri stable : les modèles de la culture de la campagne d'abord, l'ordre de l'API ensuite.
  const tries = [...modeles].sort((a, b) => Number(recommande(b)) - Number(recommande(a)));

  return (
    <section className="space-y-1.5" aria-label="Modèles de workflow">
      <h2 className="text-sm font-semibold">Modèles</h2>
      {cultureRecommandee && (
        <p className="text-[11px] text-emerald-800">
          Campagne de {cultureRecommandee.nom.toLowerCase()} : modèles adaptés en tête.
        </p>
      )}
      {modeles.length === 0 && (
        <p className="text-[11px] text-neutral-500">Aucun modèle enregistré.</p>
      )}
      {tries.map((modele) => (
        <button
          key={modele.id}
          type="button"
          disabled={chargementEnCours}
          onClick={() => surChargement({ modele })}
          title={modele.description}
          data-modele={modele.code ?? modele.id}
          className={`w-full rounded border px-2 py-1.5 text-left hover:bg-neutral-50 disabled:opacity-60 ${modele.id === modeleActifId ? 'border-emerald-600 bg-emerald-50' : 'border-neutral-200'}`}
        >
          <div className="flex items-center justify-between gap-1 text-sm font-medium">
            <span className="truncate">{modele.nom}</span>
            {recommande(modele) ? (
              <span className="shrink-0 rounded bg-emerald-100 px-1 text-[10px] text-emerald-800">
                recommandé
              </span>
            ) : (
              modele.predefini && (
                <span className="shrink-0 rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">
                  prédéfini
                </span>
              )
            )}
          </div>
          <div className="text-[11px] text-neutral-500">
            {modele.culture && `${modele.culture.nom} · `}
            {modele.nombreNoeuds} nœuds
            {modele.parametresDefaut?.aValider && ' · paramètres à valider'}
          </div>
        </button>
      ))}
    </section>
  );
}
