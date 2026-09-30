'use client';

import { prioritesDecision, type PrioriteDecision } from '@workflow/shared';
import { useState, type ReactNode } from 'react';
import type { IndicateurDisponible } from '@/components/parametres/contexte-parametres';
import { ChampNombre } from '@/components/parametres/champ-nombre';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';
import { erreursRegle, type RegleEditee } from '@/lib/regles/regle-editee';
import { BadgePriorite } from './badge-priorite';
import { ChampModeleExplication } from './champ-modele-explication';
import { PhraseRegle } from './phrase-regle';
import { SelecteurIndicateur } from './selecteur-indicateur';
import { SelecteurOperateur } from './selecteur-operateur';

interface ChampRegleProps {
  libelle: string;
  erreur?: string;
  children: ReactNode;
}

function ChampRegle({ libelle, erreur, children }: ChampRegleProps) {
  return (
    <div className="space-y-1">
      <span className="block text-[11px] font-medium text-neutral-600">{libelle}</span>
      {children}
      {erreur && <span className="block text-[11px] text-red-700">{erreur}</span>}
    </div>
  );
}

interface CarteRegleProps {
  regle: RegleEditee;
  indicateurs: readonly IndicateurDisponible[];
  surChangement: (params: { regle: RegleEditee }) => void;
  surSuppression: () => void;
  surDeplacement?: (params: { sens: -1 | 1 }) => void;
  /** Ouverte à l'affichage (ex. règle qui vient d'être ajoutée). */
  ouverteParDefaut?: boolean;
}

/**
 * Une règle métier : en-tête résumé (activation, priorité, ordre) et, dépliée, tous ses
 * champs avec les erreurs de saisie. Composant autonome, utilisable hors de l'éditeur.
 */
export function CarteRegle({
  regle,
  indicateurs,
  surChangement,
  surSuppression,
  surDeplacement,
  ouverteParDefaut = false,
}: CarteRegleProps) {
  const [ouverte, setOuverte] = useState(ouverteParDefaut);
  const erreurs = erreursRegle({ regle });
  const valide = Object.keys(erreurs).length === 0;
  const modifier = (changements: Partial<RegleEditee>) =>
    surChangement({ regle: { ...regle, ...changements } });

  return (
    <article
      className={`rounded border ${valide ? 'border-neutral-200' : 'border-red-300'} ${regle.active ? 'bg-white' : 'bg-neutral-50 opacity-75'}`}
      data-regle-id={regle.id}
    >
      <header className="flex items-start gap-2 p-2">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-emerald-700"
          checked={regle.active}
          aria-label="Règle active"
          onChange={(evenement) => modifier({ active: evenement.target.checked })}
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOuverte(!ouverte)}
        >
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{regle.nom || 'Règle sans nom'}</span>
            <BadgePriorite priorite={regle.priorite} />
            {!valide && <span className="text-[10px] font-semibold text-red-700">à compléter</span>}
          </span>
          <PhraseRegle regle={regle} />
        </button>
        <span className="flex shrink-0 gap-1 text-xs">
          {surDeplacement && (
            <>
              <button
                type="button"
                aria-label="Monter"
                onClick={() => surDeplacement({ sens: -1 })}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Descendre"
                onClick={() => surDeplacement({ sens: 1 })}
              >
                ↓
              </button>
            </>
          )}
          <button
            type="button"
            className="text-red-700"
            aria-label="Supprimer la règle"
            onClick={surSuppression}
          >
            ✕
          </button>
        </span>
      </header>

      {ouverte && (
        <div className="space-y-2 border-t border-neutral-100 p-2">
          <ChampRegle libelle="Nom" erreur={erreurs.nom}>
            <input
              type="text"
              className={CLASSES_CHAMP}
              value={regle.nom}
              maxLength={80}
              onChange={(evenement) => modifier({ nom: evenement.target.value })}
            />
          </ChampRegle>
          <ChampRegle libelle="Condition" erreur={erreurs.indicateur ?? erreurs.seuil}>
            <SelecteurIndicateur
              valeur={regle.indicateur}
              indicateurs={indicateurs}
              surChangement={({ indicateur }) => modifier({ indicateur })}
            />
            <div className="grid grid-cols-2 gap-2">
              <SelecteurOperateur
                valeur={regle.operateur}
                surChangement={({ operateur }) => modifier({ operateur })}
              />
              <ChampNombre
                nom="seuil"
                schema={{ type: 'number', title: 'Seuil' }}
                valeur={regle.seuil}
                surChangement={({ valeur }) => modifier({ seuil: valeur })}
              />
            </div>
          </ChampRegle>
          <ChampRegle libelle="Recommandation" erreur={erreurs.recommandation}>
            <textarea
              rows={2}
              className={`${CLASSES_CHAMP} resize-y`}
              value={regle.recommandation}
              maxLength={300}
              placeholder="Action conseillée, ex. moduler l’azote selon les zones."
              onChange={(evenement) => modifier({ recommandation: evenement.target.value })}
            />
          </ChampRegle>
          <ChampRegle libelle="Explication (une phrase)" erreur={erreurs.explication}>
            <ChampModeleExplication
              valeur={regle.explication}
              indicateur={regle.indicateur}
              seuil={regle.seuil}
              surChangement={({ explication }) => modifier({ explication })}
            />
          </ChampRegle>
          <ChampRegle libelle="Priorité">
            <select
              className={CLASSES_CHAMP}
              value={regle.priorite}
              onChange={(evenement) =>
                modifier({ priorite: evenement.target.value as PrioriteDecision })
              }
            >
              {prioritesDecision.map((priorite) => (
                <option key={priorite} value={priorite}>
                  {priorite}
                </option>
              ))}
            </select>
          </ChampRegle>
        </div>
      )}
    </article>
  );
}
