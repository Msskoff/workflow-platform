import {
  libellesTypesIntervention,
  type Culture,
  type ParametresCulture,
  type ResumeModele,
} from '@workflow/shared';
import { formaterDose, formaterEuros } from '@/lib/suivi/format-suivi';
import { BadgeAValider } from './badge-a-valider';

interface FicheCultureProps {
  culture: Culture;
  /** Modèles de workflow rattachés à la culture. */
  modeles: readonly ResumeModele[];
}

/** Paramètres par défaut d'un modèle : seuils NDVI, doses de référence, tarifs. */
function ParametresModele({ parametres }: { parametres: ParametresCulture }) {
  const { seuilsNdvi, dosesReference, tarifs } = parametres;
  return (
    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
      <dt className="text-neutral-500">Seuils NDVI</dt>
      <dd>
        vigueur à surveiller &lt; {seuilsNdvi.vigueurASurveiller.toLocaleString('fr-FR')} ·
        hétérogénéité &gt; {seuilsNdvi.heterogeneitePourcent} % · zone faible &gt;{' '}
        {seuilsNdvi.partZoneFaiblePourcent} %
      </dd>
      <dt className="text-neutral-500">Doses de référence</dt>
      <dd>
        {dosesReference.length === 0
          ? '—'
          : dosesReference
              .map(
                (dose) => `${dose.intrant} ${formaterDose({ dose: dose.dose, unite: dose.unite })}`,
              )
              .join(' · ')}
      </dd>
      <dt className="text-neutral-500">Tarifs HT</dt>
      <dd>
        cartographie {formaterEuros({ montant: tarifs.cartographieNdviParHa })}/ha · zonage{' '}
        {formaterEuros({ montant: tarifs.zonageParHa })}/ha · suivi{' '}
        {formaterEuros({ montant: tarifs.suiviSaisonParHa })}/ha · frais fixes{' '}
        {formaterEuros({ montant: tarifs.fraisFixes })}
      </dd>
    </dl>
  );
}

/** Une culture du référentiel : cycle, stades et interventions types, modèles associés. */
export function FicheCulture({ culture, modeles }: FicheCultureProps) {
  return (
    <article
      className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      data-culture={culture.code}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {culture.nom}
            {culture.nomScientifique && (
              <span className="font-normal italic text-neutral-500">
                {' '}
                ({culture.nomScientifique})
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-500">Cycle de {culture.cycleJours} jours</p>
        </div>
        {culture.aValider && <BadgeAValider />}
      </header>
      {culture.noteValidation && (
        <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {culture.noteValidation}
        </p>
      )}
      <table className="w-full text-xs">
        <thead className="text-left text-[10px] uppercase text-neutral-500">
          <tr>
            <th className="py-1 font-medium">Stade</th>
            <th className="py-1 text-right font-medium">Durée</th>
            <th className="py-1 pl-3 font-medium">Interventions types (jour du stade)</th>
          </tr>
        </thead>
        <tbody>
          {culture.stades.map((stade) => (
            <tr key={stade.code} className="border-t border-neutral-100 align-top">
              <td className="py-1">{stade.nom}</td>
              <td className="py-1 text-right tabular-nums">{stade.dureeJours} j</td>
              <td className="py-1 pl-3">
                {stade.interventions.length === 0
                  ? '—'
                  : stade.interventions
                      .map(
                        (intervention) =>
                          `${intervention.libelle} (${libellesTypesIntervention[intervention.type].toLowerCase()}, J${intervention.decalageJours})`,
                      )
                      .join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Modèles de workflow
        </h3>
        {modeles.length === 0 ? (
          <p className="text-xs text-neutral-500">Aucun modèle rattaché.</p>
        ) : (
          modeles.map((modele) => (
            <div key={modele.id} className="space-y-1 rounded bg-neutral-50 p-2">
              <p className="text-sm font-medium">
                {modele.nom} {modele.parametresDefaut?.aValider && <BadgeAValider />}
              </p>
              {modele.parametresDefaut && <ParametresModele parametres={modele.parametresDefaut} />}
            </div>
          ))
        )}
      </section>
    </article>
  );
}
