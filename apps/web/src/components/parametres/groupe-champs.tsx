'use client';

import {
  avecPropriete,
  libelleChamp,
  type SchemaJson,
  type ValeursObjet,
} from '@/lib/formulaire/schema-json';
import { ChampLiable } from './champ-liable';
import { ChampFichierBinaire } from './champ-fichier-binaire';
import { ChampFichierTexte } from './champ-fichier-texte';
import { ChampSchema } from './champ-schema';

interface GroupeChampsProps {
  /** Schéma de type `object`. */
  schema: SchemaJson;
  valeur: ValeursObjet;
  surChangement: (params: { valeur: ValeursObjet }) => void;
  /** Paramètres d'un nœud (premier niveau) : chaque champ peut être lié à une variable. */
  liaisonVariables?: boolean;
}

/** Champs des propriétés d'un objet, dans l'ordre du schéma (hors champs masqués). */
export function GroupeChamps({
  schema,
  valeur,
  surChangement,
  liaisonVariables = false,
}: GroupeChampsProps) {
  return (
    <div className="space-y-3">
      {Object.entries(schema.properties ?? {}).map(([nom, propriete]) => {
        if (propriete.widget === 'masque') {
          return null;
        }
        const champ = champDe({ nom, propriete });
        return liaisonVariables ? (
          <ChampLiable
            key={nom}
            libelle={libelleChamp({ nom, schema: propriete })}
            valeur={valeur[nom]}
            surChangement={({ valeur: nouvelle }) =>
              surChangement({ valeur: avecPropriete({ objet: valeur, nom, valeur: nouvelle }) })
            }
          >
            {champ}
          </ChampLiable>
        ) : (
          champ
        );
      })}
    </div>
  );

  /** Champ de saisie d'une propriété, selon son widget. */
  function champDe({ nom, propriete }: { nom: string; propriete: SchemaJson }) {
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
  }
}
