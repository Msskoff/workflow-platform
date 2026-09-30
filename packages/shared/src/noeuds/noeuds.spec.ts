import { z } from 'zod';
import type { ConnexionWorkflow } from '../domaine/workflow-snapshot';
import { trierTopologiquement } from './graphe';
import { decrireNoeud, defineNode } from './node-definition';
import { peutConnecter, validerWorkflow, type CatalogueNoeuds } from './validation';

const noeudNombre = defineNode({
  id: 'test.nombre',
  categorie: 'collecte',
  libelle: 'Nombre',
  description: 'Émet un nombre',
  entrees: {},
  sorties: { nombre: { type: 'nombre', libelle: 'Nombre' } },
  parametres: z.object({ valeur: z.number().default(1) }),
  run: async ({ params }) => ({ nombre: params.valeur }),
});

const noeudSeuil = defineNode({
  id: 'test.seuil',
  categorie: 'decision',
  libelle: 'Seuil',
  description: 'Compare à un seuil',
  entrees: {
    valeur: { type: 'nombre', libelle: 'Valeur' },
    note: { type: 'texte', libelle: 'Note', optionnel: true },
  },
  sorties: { depasse: { type: 'booleen', libelle: 'Dépassé' } },
  parametres: z.object({ seuil: z.number().default(10) }),
  // `inputs.valeur` est inféré en number, `inputs.note` en string | undefined.
  run: async ({ inputs, params }) => ({ depasse: inputs.valeur > params.seuil }),
});

const catalogue: CatalogueNoeuds = { 'test.nombre': noeudNombre, 'test.seuil': noeudSeuil };

const noeuds = [
  { id: 'a', type: 'test.nombre' },
  { id: 'b', type: 'test.seuil' },
  { id: 'c', type: 'test.seuil' },
];

function connexion({
  id,
  source,
  sourcePort,
  cible,
  ciblePort,
}: ConnexionWorkflow): ConnexionWorkflow {
  return { id, source, sourcePort, cible, ciblePort };
}

const aVersB = connexion({
  id: 'ab',
  source: 'a',
  sourcePort: 'nombre',
  cible: 'b',
  ciblePort: 'valeur',
});

describe('trierTopologiquement', () => {
  it("ordonne les nœuds dans le sens des connexions, en gardant l'ordre de déclaration", () => {
    const resultat = trierTopologiquement({
      graphe: {
        noeuds: [{ id: 'c' }, { id: 'b' }, { id: 'a' }],
        connexions: [
          { source: 'a', cible: 'b' },
          { source: 'b', cible: 'c' },
        ],
      },
    });

    expect(resultat).toEqual({ ok: true, ordre: ['a', 'b', 'c'] });
  });

  it('détecte un cycle et désigne les nœuds impliqués', () => {
    const resultat = trierTopologiquement({
      graphe: {
        noeuds: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        connexions: [
          { source: 'a', cible: 'b' },
          { source: 'b', cible: 'c' },
          { source: 'c', cible: 'b' },
        ],
      },
    });

    expect(resultat).toEqual({ ok: false, noeudsEnCycle: ['b', 'c'] });
  });
});

describe('peutConnecter', () => {
  it('accepte une sortie nombre vers une entrée nombre', () => {
    const resultat = peutConnecter({
      graphe: { noeuds, connexions: [] },
      catalogue,
      connexion: aVersB,
    });

    expect(resultat).toEqual({ ok: true });
  });

  it('refuse des types incompatibles (booléen → nombre)', () => {
    const resultat = peutConnecter({
      graphe: { noeuds, connexions: [] },
      catalogue,
      connexion: { source: 'b', sourcePort: 'depasse', cible: 'c', ciblePort: 'valeur' },
    });

    expect(resultat).toMatchObject({ ok: false, erreur: { code: 'types_incompatibles' } });
  });

  it('refuse une entrée déjà connectée, une boucle et un cycle', () => {
    const graphe = { noeuds, connexions: [aVersB] };

    expect(
      peutConnecter({
        graphe,
        catalogue,
        connexion: { source: 'a', sourcePort: 'nombre', cible: 'b', ciblePort: 'valeur' },
      }),
    ).toMatchObject({ ok: false, erreur: { code: 'entree_deja_connectee' } });
    expect(
      peutConnecter({
        graphe,
        catalogue,
        connexion: { source: 'b', sourcePort: 'depasse', cible: 'b', ciblePort: 'valeur' },
      }),
    ).toMatchObject({ ok: false, erreur: { code: 'boucle' } });
  });
});

describe('validerWorkflow', () => {
  it('ne signale rien pour un workflow valide (entrée optionnelle libre)', () => {
    expect(
      validerWorkflow({ graphe: { noeuds: noeuds.slice(0, 2), connexions: [aVersB] }, catalogue }),
    ).toEqual([]);
  });

  it('signale type inconnu, entrée obligatoire manquante et types incompatibles', () => {
    const erreurs = validerWorkflow({
      graphe: {
        noeuds: [...noeuds, { id: 'x', type: 'inexistant' }],
        connexions: [
          aVersB,
          connexion({
            id: 'bc',
            source: 'b',
            sourcePort: 'depasse',
            cible: 'c',
            ciblePort: 'valeur',
          }),
        ],
      },
      catalogue,
    });

    expect(erreurs.map((erreur) => erreur.code).sort()).toEqual([
      'entree_obligatoire_manquante',
      'type_inconnu',
      'types_incompatibles',
    ]);
  });
});

describe('decrireNoeud', () => {
  it('expose ports, JSON Schema et paramètres par défaut, sans la fonction run', () => {
    const descripteur = decrireNoeud({ definition: noeudSeuil });

    expect(descripteur).toMatchObject({
      id: 'test.seuil',
      categorie: 'decision',
      entrees: { valeur: { type: 'nombre' }, note: { type: 'texte', optionnel: true } },
      parametresParDefaut: { seuil: 10 },
      parametres: { type: 'object', properties: { seuil: { type: 'number' } } },
    });
    expect(descripteur).not.toHaveProperty('run');
  });
});
