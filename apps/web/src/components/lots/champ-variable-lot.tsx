'use client';

import { reference, type VariableWorkflow } from '@workflow/shared';
import { useState, type ChangeEvent } from 'react';
import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

/** Taille maximale d'un fichier de variable (image satellite découpée sur les parcelles). */
const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;

interface ChampVariableLotProps {
  variable: VariableWorkflow;
  valeur: string | number | undefined;
  surChangement: (params: { valeur: string | number | undefined }) => void;
}

/** Contenu d'un fichier en base64 (sans le préfixe `data:`). */
function lireBase64({ fichier }: { fichier: File }): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(String(lecteur.result).replace(/^data:[^,]*,/, ''));
    lecteur.onerror = () => rejeter(lecteur.error ?? new Error('Lecture impossible'));
    lecteur.readAsDataURL(fichier);
  });
}

/** Saisie de la valeur commune d'une variable au lancement d'un lot. */
export function ChampVariableLot({ variable, valeur, surChangement }: ChampVariableLotProps) {
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const libelle = variable.libelle || variable.nom;

  const choisirFichier = async (evenement: ChangeEvent<HTMLInputElement>) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) {
      return;
    }
    if (fichier.size > TAILLE_MAX_FICHIER) {
      setErreur('Fichier trop lourd (5 Mo maximum)');
      return;
    }
    setErreur(null);
    setNomFichier(`${fichier.name} · ${Math.round(fichier.size / 1024)} Ko`);
    surChangement({ valeur: await lireBase64({ fichier }) });
  };

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-700">
        {libelle}{' '}
        <span className="font-mono text-[10px] text-violet-700">
          {reference({ nom: variable.nom })}
        </span>
        {!variable.obligatoire && <span className="text-neutral-400"> (facultatif)</span>}
      </span>
      {variable.type === 'fichier' ? (
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <input type="file" onChange={(evenement) => void choisirFichier(evenement)} />
          {nomFichier && <span className="text-emerald-800">{nomFichier}</span>}
        </span>
      ) : (
        <input
          type={variable.type === 'nombre' ? 'number' : variable.type === 'date' ? 'date' : 'text'}
          value={valeur ?? ''}
          placeholder={
            variable.valeurParDefaut === null ? '' : `Défaut : ${variable.valeurParDefaut}`
          }
          onChange={(evenement) => {
            const brute = evenement.target.value;
            surChangement({
              valeur: brute === '' ? undefined : variable.type === 'nombre' ? Number(brute) : brute,
            });
          }}
          className={CLASSES_CHAMP}
        />
      )}
      {erreur && <span className="block text-xs text-red-700">{erreur}</span>}
    </label>
  );
}
