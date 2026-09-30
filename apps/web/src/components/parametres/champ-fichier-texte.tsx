'use client';

import { useState } from 'react';
import { libelleChamp, type SchemaJson } from '@/lib/formulaire/schema-json';
import { CLASSES_CHAMP, EtiquetteChamp } from './etiquette-champ';

interface ChampFichierTexteProps {
  nom: string;
  schema: SchemaJson;
  contenu: string;
  nomFichier: string;
  surChangement: (params: { contenu: string; nomFichier: string }) => void;
}

/**
 * Chargement d'un fichier texte (GeoJSON, CSV…) dont le contenu devient la valeur du paramètre.
 * Le contenu peut aussi être collé ou corrigé à la main.
 */
export function ChampFichierTexte({
  nom,
  schema,
  contenu,
  nomFichier,
  surChangement,
}: ChampFichierTexteProps) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const tailleMax = schema.maxLength ?? Infinity;
  const nombreLignes = contenu === '' ? 0 : contenu.split(/\r?\n/).length;

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
          if (fichier.size > tailleMax) {
            setErreur(`Fichier trop volumineux (${Math.round(fichier.size / 1024)} Ko)`);
            return;
          }
          setErreur(null);
          surChangement({ contenu: await fichier.text(), nomFichier: fichier.name });
        }}
      />
      {erreur && <span className="block text-xs text-red-700">{erreur}</span>}
      <span className="flex items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span data-fichier-charge={nomFichier || undefined}>
          {contenu === ''
            ? 'Aucun contenu'
            : `${nomFichier || 'Contenu saisi'} · ${nombreLignes} ligne(s) · ${Math.ceil(contenu.length / 1024)} Ko`}
        </span>
        <span className="flex gap-2">
          <button type="button" className="underline" onClick={() => setEdition(!edition)}>
            {edition ? 'Masquer' : 'Voir / coller'}
          </button>
          {contenu !== '' && (
            <button
              type="button"
              className="text-red-700 underline"
              onClick={() => surChangement({ contenu: '', nomFichier: '' })}
            >
              Effacer
            </button>
          )}
        </span>
      </span>
      {edition && (
        <textarea
          className={`${CLASSES_CHAMP} h-40 font-mono text-[11px]`}
          value={contenu}
          maxLength={schema.maxLength}
          onChange={(evenement) =>
            surChangement({ contenu: evenement.target.value, nomFichier: '' })
          }
        />
      )}
    </EtiquetteChamp>
  );
}
