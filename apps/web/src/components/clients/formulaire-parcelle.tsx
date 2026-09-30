'use client';

import type { GeometrieParcelle, Parcelle } from '@workflow/shared';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { creerParcelle, ErreurApi } from '@/lib/api/api-navigateur';
import { lireContourGeojson } from '@/lib/clients/lire-contour-geojson';

interface FormulaireParcelleProps {
  clientId: string;
  surCreation: (params: { parcelle: Parcelle }) => void;
}

/** Nouvelle parcelle : contour chargé depuis un fichier GeoJSON (WGS84). */
export function FormulaireParcelle({ clientId, surCreation }: FormulaireParcelleProps) {
  const [nom, setNom] = useState('');
  const [geometrie, setGeometrie] = useState<GeometrieParcelle | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const chargerFichier = async (evenement: ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) {
      return;
    }
    const resultat = lireContourGeojson({ texte: await fichier.text() });
    if (!resultat.ok) {
      setGeometrie(null);
      setErreur(resultat.erreur);
      return;
    }
    setGeometrie(resultat.geometrie);
    setErreur(null);
    if (resultat.nomPropose && nom === '') {
      setNom(resultat.nomPropose);
    }
  };

  const valider = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    // currentTarget est remis à null après l'attente : on garde le formulaire.
    const formulaire = evenement.currentTarget;
    if (!geometrie) {
      setErreur('Chargez d’abord le contour de la parcelle (fichier GeoJSON).');
      return;
    }
    setEnvoi(true);
    try {
      const parcelle = await creerParcelle({ donnees: { clientId, nom: nom.trim(), geometrie } });
      surCreation({ parcelle });
      setNom('');
      setGeometrie(null);
      setErreur(null);
      formulaire.reset();
    } catch (probleme) {
      setErreur(probleme instanceof ErreurApi ? probleme.details.join(' · ') : String(probleme));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form
      onSubmit={(evenement) => void valider(evenement)}
      className="flex flex-wrap items-end gap-2 rounded bg-neutral-50 p-2"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Contour GPS (GeoJSON)
        <input
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          onChange={(evenement) => void chargerFichier(evenement)}
          className="text-xs"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Nom de la parcelle
        <input
          required
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={envoi || !geometrie}
        className="rounded border border-neutral-400 bg-white px-3 py-1 text-sm hover:bg-neutral-100 disabled:text-neutral-400"
      >
        Ajouter la parcelle
      </button>
      {geometrie && (
        <span className="text-xs text-emerald-700">
          Contour chargé ({geometrie.type === 'Polygon' ? 'polygone' : 'multipolygone'})
        </span>
      )}
      {erreur && <p className="w-full text-sm text-red-700">{erreur}</p>}
    </form>
  );
}
