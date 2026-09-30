'use client';

import {
  avecPropriete,
  estObjet,
  libelleChamp,
  type SchemaJson,
  type ValeursObjet,
} from '@/lib/formulaire/schema-json';
import { ChampNombre } from './champ-nombre';
import { ChampTexte } from './champ-texte';

interface ChampPhotosProps {
  nom: string;
  schema: SchemaJson;
  valeur: unknown;
  surChangement: (params: { valeur: ValeursObjet[] }) => void;
}

/** Métadonnées lisibles sans envoyer l'image : nom, type, taille, date du fichier. */
function metadonneesPhoto({ fichier }: { fichier: File }): ValeursObjet {
  return {
    nom: fichier.name,
    typeMime: fichier.type,
    tailleOctets: fichier.size,
    modifieeLe: new Date(fichier.lastModified).toISOString(),
    legende: '',
  };
}

/**
 * Photos terrain : on sélectionne les images, seules leurs métadonnées sont conservées.
 * Coordonnées et légende se complètent à la main.
 */
export function ChampPhotos({ nom, schema, valeur, surChangement }: ChampPhotosProps) {
  const photos = Array.isArray(valeur) ? valeur.filter(estObjet) : [];
  const proprietes = schema.items?.properties ?? {};
  const maximum = schema.maxItems ?? Infinity;

  const modifier = ({ index, photo }: { index: number; photo: ValeursObjet }) =>
    surChangement({
      valeur: photos.map((existante, rang) => (rang === index ? photo : existante)),
    });

  return (
    <fieldset className="space-y-2 rounded border border-neutral-200 p-2">
      <legend className="px-1 text-xs font-semibold text-neutral-700">
        {libelleChamp({ nom, schema })} ({photos.length})
      </legend>
      {schema.description && <p className="text-[11px] text-neutral-500">{schema.description}</p>}

      {photos.map((photo, index) => (
        <div
          key={`${String(photo.nom)}-${index}`}
          className="space-y-1.5 rounded bg-neutral-50 p-2"
        >
          <div className="flex items-start justify-between gap-2 text-xs">
            <span className="min-w-0">
              <span className="block truncate font-medium">{String(photo.nom)}</span>
              <span className="text-[11px] text-neutral-500">
                {Math.round(Number(photo.tailleOctets ?? 0) / 1024)} Ko
                {photo.modifieeLe
                  ? ` · ${new Date(String(photo.modifieeLe)).toLocaleString('fr-FR')}`
                  : ''}
              </span>
            </span>
            <button
              type="button"
              className="text-[11px] text-red-700 underline"
              onClick={() => surChangement({ valeur: photos.filter((_, rang) => rang !== index) })}
            >
              Retirer
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['latitude', 'longitude'] as const).map((coordonnee) => (
              <ChampNombre
                key={coordonnee}
                nom={coordonnee}
                schema={proprietes[coordonnee] ?? { type: 'number' }}
                valeur={photo[coordonnee]}
                surChangement={({ valeur: nombre }) =>
                  modifier({
                    index,
                    photo: avecPropriete({ objet: photo, nom: coordonnee, valeur: nombre }),
                  })
                }
              />
            ))}
          </div>
          <ChampTexte
            nom="legende"
            schema={proprietes.legende ?? { type: 'string' }}
            valeur={photo.legende}
            surChangement={({ valeur: texte }) =>
              modifier({
                index,
                photo: avecPropriete({ objet: photo, nom: 'legende', valeur: texte }),
              })
            }
          />
        </div>
      ))}

      {photos.length < maximum && (
        <label className="block cursor-pointer rounded border border-dashed border-neutral-300 px-2 py-1.5 text-center text-xs text-neutral-600 hover:bg-neutral-50">
          + Ajouter des photos (seules les métadonnées sont gardées)
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(evenement) => {
              const fichiers = [...(evenement.target.files ?? [])];
              evenement.target.value = '';
              const ajouts = fichiers.map((fichier) => metadonneesPhoto({ fichier }));
              surChangement({ valeur: [...photos, ...ajouts].slice(0, maximum) });
            }}
          />
        </label>
      )}
    </fieldset>
  );
}
