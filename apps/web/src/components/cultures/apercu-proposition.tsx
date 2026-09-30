'use client';

import type { PropositionCampagne } from '@workflow/shared';
import { useEffect, useState } from 'react';
import { ErreurApi, lirePropositionCulture } from '@/lib/api/api-navigateur';
import { BadgeAValider } from './badge-a-valider';
import { CalendrierPrevisionnel } from './calendrier-previsionnel';
import { ModelesProposes } from './modeles-proposes';

interface ApercuPropositionProps {
  cultureId: string;
  dateDebut: string;
  /** Campagne existante : les modèles s'ouvrent dans l'éditeur avec elle. */
  campagneId?: string;
}

type Resultat =
  { etape: 'pret'; proposition: PropositionCampagne } | { etape: 'erreur'; message: string };

/** Ce que le système propose pour une culture : modèles adaptés et calendrier prévisionnel. */
export function ApercuProposition({ cultureId, dateDebut, campagneId }: ApercuPropositionProps) {
  const cle = `${cultureId}|${dateDebut}`;
  // Résultat de la dernière demande ; périmé (donc « chargement ») si la culture ou la date change.
  const [resultat, setResultat] = useState<{ cle: string; valeur: Resultat } | null>(null);

  useEffect(() => {
    let actif = true;
    lirePropositionCulture({ cultureId, dateDebut }).then(
      (proposition) => actif && setResultat({ cle, valeur: { etape: 'pret', proposition } }),
      (erreur: unknown) =>
        actif &&
        setResultat({
          cle,
          valeur: {
            etape: 'erreur',
            message: erreur instanceof ErreurApi ? erreur.details.join(' · ') : String(erreur),
          },
        }),
    );
    return () => {
      actif = false;
    };
  }, [cle, cultureId, dateDebut]);

  const etat = resultat?.cle === cle ? resultat.valeur : ({ etape: 'chargement' } as const);

  if (etat.etape === 'chargement') {
    return <p className="text-xs text-neutral-500">Préparation du calendrier…</p>;
  }
  if (etat.etape === 'erreur') {
    return <p className="text-xs text-red-700">{etat.message}</p>;
  }
  const { culture, modeles, calendrier } = etat.proposition;
  const aValider =
    culture.aValider || modeles.some((modele) => modele.parametresDefaut?.aValider === true);
  return (
    <div className="space-y-3 rounded border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {culture.nom}
          {culture.nomScientifique && (
            <span className="font-normal italic text-neutral-500">
              {' '}
              ({culture.nomScientifique})
            </span>
          )}{' '}
          · cycle de {culture.cycleJours} jours
        </p>
        {aValider && <BadgeAValider note={culture.noteValidation} />}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Modèles proposés
        </p>
        <ModelesProposes modeles={modeles} campagneId={campagneId} />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Calendrier prévisionnel des interventions
        </p>
        <CalendrierPrevisionnel calendrier={calendrier} />
      </div>
    </div>
  );
}
