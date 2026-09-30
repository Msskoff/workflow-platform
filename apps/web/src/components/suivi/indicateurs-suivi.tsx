import type { IndicateursSuivi as Indicateurs } from '@workflow/shared';
import { formaterEcartPourcent, formaterEuros } from '@/lib/suivi/format-suivi';

interface IndicateursSuiviProps {
  indicateurs: Indicateurs;
  /** Version compacte (une ligne), pour la liste des campagnes. */
  compact?: boolean;
}

/** Taux d'application des recommandations et écarts prévu/réel d'une campagne. */
export function IndicateursSuivi({ indicateurs, compact = false }: IndicateursSuiviProps) {
  const taux =
    indicateurs.tauxApplicationPourcent === null
      ? '—'
      : `${indicateurs.tauxApplicationPourcent.toLocaleString('fr-FR')} %`;
  const cartes = [
    {
      cle: 'taux',
      libelle: 'Taux d’application',
      valeur: taux,
      detail: `${indicateurs.appliquees} appliquée(s) sur ${indicateurs.conseillees} conseillée(s)`,
    },
    {
      cle: 'reste',
      libelle: 'Reste à faire',
      valeur: String(indicateurs.aFaire),
      detail: `${indicateurs.nonAppliquees} non appliquée(s) · ${indicateurs.enPreparation} en préparation`,
    },
    {
      cle: 'cout',
      libelle: 'Écart de coût',
      valeur:
        indicateurs.ecartCoutPourcent === null
          ? '—'
          : formaterEcartPourcent({ ecart: indicateurs.ecartCoutPourcent }),
      detail:
        indicateurs.coutPrevu === null || indicateurs.coutReel === null
          ? 'Aucun coût prévu et réel à comparer'
          : `${formaterEuros({ montant: indicateurs.coutReel })} réel pour ${formaterEuros({ montant: indicateurs.coutPrevu })} prévu (${indicateurs.decisionsComparablesCout} décision(s))`,
    },
    {
      cle: 'dose',
      libelle: 'Écart de dose moyen',
      valeur:
        indicateurs.ecartDoseMoyenPourcent === null
          ? '—'
          : formaterEcartPourcent({ ecart: indicateurs.ecartDoseMoyenPourcent }),
      detail:
        indicateurs.decisionsComparablesDose === 0
          ? 'Aucune dose prévue et réelle à comparer'
          : `Sur ${indicateurs.decisionsComparablesDose} décision(s), à unité identique`,
    },
  ];

  if (compact) {
    return (
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        {cartes.map((carte) => (
          <div key={carte.cle} className="flex gap-1">
            <dt>{carte.libelle} :</dt>
            <dd className="font-semibold text-neutral-900">{carte.valeur}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cartes.map((carte) => (
        <div key={carte.cle} className="rounded-lg border border-neutral-200 bg-white p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {carte.libelle}
          </dt>
          <dd className="text-2xl font-semibold text-neutral-900">{carte.valeur}</dd>
          <dd className="text-xs text-neutral-500">{carte.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
