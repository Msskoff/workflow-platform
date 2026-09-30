'use client';

import { avecPropriete, type SchemaJson, type ValeursObjet } from '@/lib/formulaire/schema-json';
import { ChampFichierBinaire } from './champ-fichier-binaire';
import { ChampFichierTexte } from './champ-fichier-texte';
import { ChampSchema } from './champ-schema';

interface GroupeChampsProps {
  /** Schéma de type `object`. */
  schema: SchemaJson;
  valeur: ValeursObjet;
  surChangement: (params: { valeur: ValeursObjet }) => void;
}

/** Champs des propriétés d'un objet, dans l'ordre du schéma (hors champs masqués). */
export function GroupeChamps({ schema, valeur, surChangement }: GroupeChampsProps) {
  return (
    <div className="space-y-3">
      {Object.entries(schema.properties ?? {}).map(([nom, propriete]) => {
        if (propriete.widget === 'masque') {
          return null;
        }
        if (propriete.widget === 'fichier-texte' || propriete.widget === 'fichier-binaire') {
          const ChampFichier =
            propriete.widget === 'fichier-texte' ? ChampFichierTexte : ChampFichierBinaire;
          const champNom = propriete.champNomFichier;
          return (
            <ChampFichier
              key={nom}
              nom={nom}
              schema={propriete}
              contenu={typeof valeur[nom] === 'string' ? valeur[nom] : ''}
              nomFichier={champNom && typeof valeur[champNom] === 'string' ? valeur[champNom] : ''}
              surChangement={({ contenu, nomFichier }) => {
                const avecContenu = avecPropriete({ objet: valeur, nom, valeur: contenu });
                surChangement({
                  valeur: champNom
                    ? avecPropriete({ objet: avecContenu, nom: champNom, valeur: nomFichier })
                    : avecContenu,
                });
              }}
            />
          );
        }
        return (
          <ChampSchema
            key={nom}
            nom={nom}
            schema={propriete}
            valeur={valeur[nom]}
            surChangement={({ valeur: nouvelle }) =>
              surChangement({ valeur: avecPropriete({ objet: valeur, nom, valeur: nouvelle }) })
            }
          />
        );
      })}
    </div>
  );
}
