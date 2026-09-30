'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ErreurApi, marquerFait } from '@/lib/api/api-navigateur';

interface CaseFaitProps {
  jeton: string;
  decisionId: string;
  fait: boolean;
  /** Application confirmée par le conseiller : case figée. */
  confirme: boolean;
  /** Texte de l'action, lu à côté de la case. */
  libelle: string;
  /** Mention affichée sous l'action (priorité, date…). */
  complement?: string;
}

/**
 * Case « fait » d'une recommandation, pour le fermier ou l'agent terrain. Grande zone de clic,
 * état affiché tout de suite puis confirmé par le serveur (remis en place en cas d'échec).
 */
export function CaseFait({
  jeton,
  decisionId,
  fait,
  confirme,
  libelle,
  complement,
}: CaseFaitProps) {
  const router = useRouter();
  const [coche, setCoche] = useState(fait);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [, demarrerTransition] = useTransition();

  const basculer = async () => {
    const voulu = !coche;
    setCoche(voulu);
    setErreur(null);
    setEnvoi(true);
    try {
      const decision = await marquerFait({ jeton, decisionId, fait: voulu });
      setCoche(decision.fait);
      // Chronologie et recommandations se mettent à jour sans recharger la page.
      demarrerTransition(() => router.refresh());
    } catch (probleme) {
      setCoche(!voulu);
      setErreur(
        probleme instanceof ErreurApi
          ? (probleme.details[0] ?? probleme.message)
          : 'Pas de connexion : réessayez dans un instant.',
      );
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-neutral-50">
        <input
          type="checkbox"
          checked={coche}
          disabled={envoi || confirme}
          onChange={() => void basculer()}
          className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-emerald-700"
        />
        <span className="text-sm">
          <span className={coche ? 'text-neutral-500 line-through' : 'text-neutral-800'}>
            {libelle}
          </span>
          {coche && (
            <span className="ml-2 text-xs font-semibold text-emerald-700">
              {confirme ? 'Fait, confirmé par votre conseiller' : 'Fait'}
            </span>
          )}
          {complement && <span className="block text-xs text-neutral-500">{complement}</span>}
        </span>
      </label>
      {erreur && (
        <p className="ml-11 text-xs text-red-700" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
