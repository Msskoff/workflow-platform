'use client';

import type { Campagne, Culture } from '@workflow/shared';
import { useState, type FormEvent } from 'react';
import { ApercuProposition } from '@/components/cultures/apercu-proposition';
import { creerCampagne, ErreurApi } from '@/lib/api/api-navigateur';
import { aujourdHui } from '@/lib/suivi/format-suivi';

/** Valeur du sélecteur pour une culture hors référentiel, saisie librement. */
const AUTRE_CULTURE = 'autre';

interface FormulaireCampagneProps {
  parcelleId: string;
  /** Référentiel des cultures (stades, modèles associés). */
  cultures: readonly Culture[];
  surCreation: (params: { campagne: Campagne }) => void;
}

/**
 * Nouvelle campagne (saison) sur une parcelle. Choisir une culture du référentiel affiche
 * aussitôt les modèles proposés et le calendrier prévisionnel des interventions.
 */
export function FormulaireCampagne({ parcelleId, cultures, surCreation }: FormulaireCampagneProps) {
  const [nom, setNom] = useState(`Saison ${new Date().getFullYear()}`);
  const [cultureId, setCultureId] = useState('');
  const [cultureLibre, setCultureLibre] = useState('');
  const [dateDebut, setDateDebut] = useState(aujourdHui);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const duReferentiel = cultureId !== '' && cultureId !== AUTRE_CULTURE;

  const valider = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setEnvoi(true);
    try {
      const campagne = await creerCampagne({
        donnees: {
          parcelleId,
          nom: nom.trim(),
          dateDebut,
          ...(duReferentiel && { cultureId }),
          ...(cultureId === AUTRE_CULTURE &&
            cultureLibre.trim() && { culture: cultureLibre.trim() }),
        },
      });
      surCreation({ campagne });
      setCultureId('');
      setCultureLibre('');
      setErreur(null);
    } catch (probleme) {
      setErreur(probleme instanceof ErreurApi ? probleme.details.join(' · ') : String(probleme));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={(evenement) => void valider(evenement)} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Campagne
          <input
            required
            value={nom}
            onChange={(evenement) => setNom(evenement.target.value)}
            className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Culture
          <select
            value={cultureId}
            onChange={(evenement) => setCultureId(evenement.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="">Non précisée</option>
            {cultures.map((culture) => (
              <option key={culture.id} value={culture.id}>
                {culture.nom}
              </option>
            ))}
            <option value={AUTRE_CULTURE}>Autre (saisie libre)</option>
          </select>
        </label>
        {cultureId === AUTRE_CULTURE && (
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Nom de la culture
            <input
              required
              value={cultureLibre}
              maxLength={100}
              onChange={(evenement) => setCultureLibre(evenement.target.value)}
              className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Début
          <input
            type="date"
            required
            value={dateDebut}
            onChange={(evenement) => setDateDebut(evenement.target.value)}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={envoi}
          className="rounded border border-neutral-400 bg-white px-3 py-1 text-sm hover:bg-neutral-100"
        >
          Ajouter la campagne
        </button>
      </div>
      {duReferentiel && dateDebut && (
        <ApercuProposition cultureId={cultureId} dateDebut={dateDebut} />
      )}
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
    </form>
  );
}
