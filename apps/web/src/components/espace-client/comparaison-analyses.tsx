'use client';

import type { AnalysePubliee } from '@workflow/shared';
import { useState } from 'react';
import { CarteParcelle } from '@/components/cartographie/carte-parcelle';
import {
  formaterMoment,
  formaterValeur,
  indicateursPresents,
  qualifierEvolution,
} from '@/lib/espace-client/indicateurs-client';

const STYLES_TENDANCE = {
  mieux: { texte: 'En progrès', classe: 'text-emerald-700' },
  moins_bien: { texte: 'À surveiller', classe: 'text-amber-700' },
  stable: { texte: 'Stable', classe: 'text-neutral-500' },
} as const;

interface SelecteurDateProps {
  libelle: string;
  analyses: readonly AnalysePubliee[];
  /** Libellé de chaque analyse, par identifiant. */
  libelles: ReadonlyMap<string, string>;
  valeur: string;
  surChoix: (params: { analyseId: string }) => void;
}

function SelecteurDate({ libelle, analyses, libelles, valeur, surChoix }: SelecteurDateProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-neutral-700">{libelle}</span>
      <select
        value={valeur}
        onChange={(evenement) => surChoix({ analyseId: evenement.target.value })}
        className="rounded-lg border border-neutral-300 px-2 py-1.5"
      >
        {analyses.map((analyse) => (
          <option key={analyse.id} value={analyse.id}>
            {libelles.get(analyse.id)}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ComparaisonAnalysesProps {
  /** Analyses publiées, de la plus récente à la plus ancienne. */
  analyses: readonly AnalysePubliee[];
}

/** Deux dates côte à côte : les deux cartes et l'évolution des chiffres clés. */
export function ComparaisonAnalyses({ analyses }: ComparaisonAnalysesProps) {
  const [avantId, setAvantId] = useState(analyses[1]?.id ?? '');
  const [apresId, setApresId] = useState(analyses[0]?.id ?? '');
  // Numérotées de la plus ancienne (1) à la plus récente : deux analyses du même jour restent distinctes.
  const libelles = new Map(
    analyses.map((analyse, index) => [
      analyse.id,
      `Analyse ${analyses.length - index} · ${formaterMoment({ date: analyse.date })}`,
    ]),
  );

  if (analyses.length < 2) {
    return (
      <p className="text-sm text-neutral-600">
        La comparaison sera disponible dès la deuxième analyse de cette parcelle.
      </p>
    );
  }
  const avant = analyses.find((analyse) => analyse.id === avantId);
  const apres = analyses.find((analyse) => analyse.id === apresId);
  if (!avant || !apres) {
    return null;
  }
  const indicateurs = indicateursPresents({ indicateurs: avant.rapport.indicateurs }).filter(
    (indicateur) => apres.rapport.indicateurs[indicateur.cle] !== undefined,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { libelle: 'Première date', analyse: avant, surChoix: setAvantId },
          { libelle: 'Seconde date', analyse: apres, surChoix: setApresId },
        ].map(({ libelle, analyse, surChoix }) => (
          <figure key={libelle} className="space-y-2">
            <SelecteurDate
              libelle={libelle}
              analyses={analyses}
              libelles={libelles}
              valeur={analyse.id}
              surChoix={({ analyseId }) => surChoix(analyseId)}
            />
            <CarteParcelle
              carte={analyse.rapport.carte}
              titre={`Zones de vigueur, ${libelles.get(analyse.id) ?? ''}`}
              largeur={400}
              hauteur={280}
            />
          </figure>
        ))}
      </div>

      {avant.id === apres.id ? (
        <p className="text-sm text-neutral-600">Choisissez deux dates différentes.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
              <th className="py-2 font-medium">Indicateur</th>
              <th className="py-2 text-right font-medium">{libelles.get(avant.id)}</th>
              <th className="py-2 text-right font-medium">{libelles.get(apres.id)}</th>
              <th className="py-2 text-right font-medium">Évolution</th>
            </tr>
          </thead>
          <tbody>
            {indicateurs.map((indicateur) => {
              const valeurAvant = avant.rapport.indicateurs[indicateur.cle] ?? 0;
              const valeurApres = apres.rapport.indicateurs[indicateur.cle] ?? 0;
              const { ecart, tendance } = qualifierEvolution({
                avant: valeurAvant,
                apres: valeurApres,
                indicateur,
              });
              const style = STYLES_TENDANCE[tendance];
              return (
                <tr key={indicateur.cle} className="border-b border-neutral-100">
                  <td className="py-2">{indicateur.libelle}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formaterValeur({ valeur: valeurAvant, indicateur })}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formaterValeur({ valeur: valeurApres, indicateur })}
                  </td>
                  <td className={`py-2 text-right ${style.classe}`}>
                    <span className="tabular-nums">
                      {ecart > 0 ? '+' : ''}
                      {formaterValeur({ valeur: ecart, indicateur })}
                    </span>{' '}
                    · {style.texte}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
