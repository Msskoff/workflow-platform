'use client';

import type { Decision, PhotoApplication, SaisieReel } from '@workflow/shared';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { CLASSES_CHAMP, EtiquetteChamp } from '@/components/parametres/etiquette-champ';
import { reduirePhoto } from '@/lib/images/reduire-photo';
import { aujourdHui } from '@/lib/suivi/format-suivi';
import { ChampNombreOptionnel, lireNombre, versTexte } from './champ-nombre-optionnel';

interface FormulaireReelProps {
  decision: Decision;
  enCours: boolean;
  /** Libellé du bouton d'enregistrement. */
  libelleAction: string;
  surEnregistrement: (params: { reel: SaisieReel }) => void;
  surAnnulation: () => void;
}

/**
 * Volet « réel » saisi après application. Pré-rempli avec le réel déjà saisi, sinon avec
 * le prévu (on ne corrige que ce qui a changé). La photo est réduite avant envoi.
 */
export function FormulaireReel({
  decision,
  enCours,
  libelleAction,
  surEnregistrement,
  surAnnulation,
}: FormulaireReelProps) {
  const depart = decision.reel ?? {
    produit: decision.prevu.produit,
    dose: decision.prevu.dose,
    uniteDose: decision.prevu.uniteDose,
    date: aujourdHui(),
    cout: null,
    photo: false,
  };
  const [produit, setProduit] = useState(depart.produit ?? '');
  const [dose, setDose] = useState(versTexte({ nombre: depart.dose }));
  const [uniteDose, setUniteDose] = useState(depart.uniteDose ?? '');
  const [date, setDate] = useState(depart.date);
  const [cout, setCout] = useState(versTexte({ nombre: depart.cout }));
  /** `undefined` : photo inchangée ; `null` : retirée. */
  const [photo, setPhoto] = useState<PhotoApplication | null | undefined>(undefined);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [reductionEnCours, setReductionEnCours] = useState(false);

  const choisirPhoto = async (evenement: ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) {
      return;
    }
    setReductionEnCours(true);
    try {
      setPhoto(await reduirePhoto({ fichier }));
      setErreurPhoto(null);
    } catch (erreur) {
      setErreurPhoto(erreur instanceof Error ? erreur.message : String(erreur));
    } finally {
      setReductionEnCours(false);
    }
  };

  const valider = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    surEnregistrement({
      reel: {
        produit: produit.trim() || null,
        dose: lireNombre({ texte: dose }),
        uniteDose: uniteDose.trim() || null,
        date,
        cout: lireNombre({ texte: cout }),
        ...(photo !== undefined && { photo }),
      },
    });
  };

  const photoPresente = photo === undefined ? depart.photo : photo !== null;

  return (
    <form
      onSubmit={valider}
      className="space-y-2 rounded border border-emerald-200 bg-emerald-50 p-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
        Réel (après application)
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <EtiquetteChamp libelle="Produit">
          <input
            value={produit}
            maxLength={120}
            onChange={(evenement) => setProduit(evenement.target.value)}
            className={CLASSES_CHAMP}
          />
        </EtiquetteChamp>
        <ChampNombreOptionnel
          libelle="Dose"
          valeur={dose}
          surChangement={({ valeur }) => setDose(valeur)}
        />
        <EtiquetteChamp libelle="Unité">
          <input
            value={uniteDose}
            maxLength={20}
            onChange={(evenement) => setUniteDose(evenement.target.value)}
            className={CLASSES_CHAMP}
          />
        </EtiquetteChamp>
        <EtiquetteChamp libelle="Date d’application">
          <input
            type="date"
            required
            value={date}
            onChange={(evenement) => setDate(evenement.target.value)}
            className={CLASSES_CHAMP}
          />
        </EtiquetteChamp>
        <ChampNombreOptionnel
          libelle="Coût réel"
          valeur={cout}
          suffixe="€"
          surChangement={({ valeur }) => setCout(valeur)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="font-medium text-neutral-700">Photo (facultative)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(evenement) => void choisirPhoto(evenement)}
          />
        </label>
        {reductionEnCours && <span className="text-neutral-500">Réduction…</span>}
        {photoPresente && !reductionEnCours && (
          <>
            <span className="text-emerald-800">
              {photo
                ? `Photo prête (${Math.round((photo.base64.length * 0.75) / 1024)} Ko)`
                : 'Photo jointe'}
            </span>
            <button type="button" className="underline" onClick={() => setPhoto(null)}>
              Retirer la photo
            </button>
          </>
        )}
        {erreurPhoto && <span className="text-red-700">{erreurPhoto}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enCours || reductionEnCours}
          className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-neutral-300"
        >
          {libelleAction}
        </button>
        <button type="button" className="text-xs underline" onClick={surAnnulation}>
          Annuler
        </button>
      </div>
    </form>
  );
}
