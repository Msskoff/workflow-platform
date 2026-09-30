'use client';

import { useState } from 'react';
import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { EtiquetteChamp } from './etiquette-champ';

/** Contenu d'un fichier encodé en base64 (sans le préfixe `data:…;base64,`). */
function lireEnBase64({ fichier }: { fichier: File }): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result).replace(/^data:[^,]*,/, ''));
    lecteur.onerror = () => reject(lecteur.error ?? new Error('Lecture du fichier impossible'));
    lecteur.readAsDataURL(fichier);
  });
}

interface ChampFichierBinaireProps {
  nom: string;
  schema: SchemaJson;
  /** Contenu actuel, en base64. */
  contenu: string;
  nomFichier: string;
  surChangement: (params: { contenu: string; nomFichier: string }) => void;
}

/** Chargement d'un fichier binaire (image GeoTIFF…) transmis en base64 dans les paramètres. */
export function ChampFichierBinaire({
  nom,
  schema,
  contenu,
  nomFichier,
  surChangement,
}: ChampFichierBinaireProps) {
  const [erreur, setErreur] = useState<string | null>(null);
  // La taille en base64 vaut 4/3 de la taille du fichier.
  const tailleMaxOctets = schema.maxLength ? Math.floor((schema.maxLength * 3) / 4) : Infinity;
  const tailleKo = Math.ceil((contenu.length * 3) / 4 / 1024);

  return (
    <EtiquetteChamp libelle={libelleChamp({ nom, schema })} description={schema.description}>
      <input
        type="file"
        accept={schema.accept}
        className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-emerald-700 file:px-3 file:py-1 file:text-white hover:file:bg-emerald-800"
        onChange={async (evenement) => {
          const fichier = evenement.target.files?.[0];
          evenement.target.value = '';
          if (!fichier) {
            return;
          }
          if (fichier.size > tailleMaxOctets) {
            setErreur(`Fichier trop volumineux (${Math.round(fichier.size / 1024)} Ko)`);
            return;
          }
          try {
            setErreur(null);
            surChangement({ contenu: await lireEnBase64({ fichier }), nomFichier: fichier.name });
          } catch (echec) {
            setErreur(echec instanceof Error ? echec.message : String(echec));
          }
        }}
      />
      {erreur && <span className="block text-xs text-red-700">{erreur}</span>}
      <span className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span data-fichier-charge={nomFichier || undefined}>
          {contenu === '' ? 'Aucun fichier' : `${nomFichier || 'Fichier chargé'} · ${tailleKo} Ko`}
        </span>
        {contenu !== '' && (
          <button
            type="button"
            className="text-red-700 underline"
            onClick={() => surChangement({ contenu: '', nomFichier: '' })}
          >
            Retirer
          </button>
        )}
      </span>
    </EtiquetteChamp>
  );
}
