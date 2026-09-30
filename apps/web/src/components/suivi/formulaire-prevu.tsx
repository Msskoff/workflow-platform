'use client';

import type { VoletPrevu } from '@workflow/shared';
import { useState, type FormEvent } from 'react';
import { CLASSES_CHAMP, EtiquetteChamp } from '@/components/parametres/etiquette-champ';
import { ChampNombreOptionnel, lireNombre, versTexte } from './champ-nombre-optionnel';

interface FormulairePrevuProps {
  prevu: VoletPrevu;
  enCours: boolean;
  surEnregistrement: (params: { prevu: VoletPrevu }) => void;
}

/** Volet « prévu » : produit, dose, date et coût estimé, modifiable jusqu'à l'envoi. */
export function FormulairePrevu({ prevu, enCours, surEnregistrement }: FormulairePrevuProps) {
  const [produit, setProduit] = useState(prevu.produit ?? '');
  const [dose, setDose] = useState(versTexte({ nombre: prevu.dose }));
  const [uniteDose, setUniteDose] = useState(prevu.uniteDose ?? '');
  const [date, setDate] = useState(prevu.date ?? '');
  const [cout, setCout] = useState(versTexte({ nombre: prevu.coutEstime }));

  const valider = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    surEnregistrement({
      prevu: {
        produit: produit.trim() || null,
        dose: lireNombre({ texte: dose }),
        uniteDose: uniteDose.trim() || null,
        date: date || null,
        coutEstime: lireNombre({ texte: cout }),
      },
    });
  };

  return (
    <form onSubmit={valider} className="space-y-2 rounded bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Prévu</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <EtiquetteChamp libelle="Produit">
          <input
            value={produit}
            maxLength={120}
            onChange={(evenement) => setProduit(evenement.target.value)}
            className={CLASSES_CHAMP}
            placeholder="Urée 46 %"
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
            placeholder="kg/ha"
            list="unites-dose"
          />
        </EtiquetteChamp>
        <EtiquetteChamp libelle="Date prévue">
          <input
            type="date"
            value={date}
            onChange={(evenement) => setDate(evenement.target.value)}
            className={CLASSES_CHAMP}
          />
        </EtiquetteChamp>
        <ChampNombreOptionnel
          libelle="Coût estimé"
          valeur={cout}
          suffixe="€"
          surChangement={({ valeur }) => setCout(valeur)}
        />
      </div>
      <datalist id="unites-dose">
        {['kg/ha', 'L/ha', 'mm', 't/ha', 'doses/ha'].map((unite) => (
          <option key={unite} value={unite} />
        ))}
      </datalist>
      <button
        type="submit"
        disabled={enCours}
        className="rounded border border-neutral-400 bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-100 disabled:text-neutral-400"
      >
        Enregistrer le prévu
      </button>
    </form>
  );
}
