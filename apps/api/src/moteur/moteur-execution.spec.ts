import { defineNode, type GrapheWorkflow } from '@workflow/shared';
import { z } from 'zod';
import { creerRegistreNoeuds, RegistreNoeuds } from '../noeuds/registre-noeuds';
import {
  executerWorkflow,
  WorkflowInvalideErreur,
  type ObservateurExecution,
} from './moteur-execution';

const CONTEXTE = { executionId: 'exe', campagneId: 'cam' };

/** Observateur qui consigne les événements sous la forme `noeud:statut`. */
function observateurEspion(): { evenements: string[]; observateur: ObservateurExecution } {
  const evenements: string[] = [];
  return {
    evenements,
    observateur: {
      noeudDemarre: async ({ noeudId }) => {
        evenements.push(`${noeudId}:en_cours`);
      },
      noeudTermine: async ({ noeudId }) => {
        evenements.push(`${noeudId}:ok`);
      },
      noeudEchoue: async ({ noeudId }) => {
        evenements.push(`${noeudId}:erreur`);
      },
    },
  };
}

interface GrapheChaineParams {
  valeur: number;
}

/** `mesure` → `regle`, déclarés à l'envers pour vérifier le tri topologique. */
function grapheChaine({ valeur }: GrapheChaineParams): GrapheWorkflow {
  return {
    noeuds: [
      { id: 'regle', type: 'factice.seuil', parametres: { seuil: 20, dureeMs: 0 } },
      { id: 'mesure', type: 'factice.nombre', parametres: { valeur, dureeMs: 0 } },
    ],
    connexions: [
      { id: 'c1', source: 'mesure', sourcePort: 'nombre', cible: 'regle', ciblePort: 'valeur' },
    ],
  };
}

describe('executerWorkflow', () => {
  const registre = creerRegistreNoeuds();

  it('exécute dans l’ordre topologique et transmet la sortie à l’entrée suivante', async () => {
    const { evenements, observateur } = observateurEspion();

    const resultat = await executerWorkflow({
      graphe: grapheChaine({ valeur: 25 }),
      registre,
      contexte: CONTEXTE,
      observateur,
    });

    expect(evenements).toEqual(['mesure:en_cours', 'mesure:ok', 'regle:en_cours', 'regle:ok']);
    expect(resultat).toEqual({
      statut: 'ok',
      sorties: {
        mesure: { nombre: 25 },
        regle: { depasse: true, message: '25 > seuil 20' },
      },
    });
  });

  it("s'arrête au nœud en erreur et le signale", async () => {
    const { evenements, observateur } = observateurEspion();

    const resultat = await executerWorkflow({
      graphe: grapheChaine({ valeur: -1 }),
      registre,
      contexte: CONTEXTE,
      observateur,
    });

    expect(evenements).toEqual(['mesure:en_cours', 'mesure:ok', 'regle:en_cours', 'regle:erreur']);
    expect(resultat).toMatchObject({ statut: 'erreur', noeudId: 'regle' });
  });

  it('refuse un cycle avant toute exécution', async () => {
    const noeudRelais = defineNode({
      id: 'test.relais',
      categorie: 'standardisation',
      libelle: 'Relais',
      description: 'Recopie un nombre',
      entrees: { valeur: { type: 'nombre', libelle: 'Valeur' } },
      sorties: { valeur: { type: 'nombre', libelle: 'Valeur' } },
      parametres: z.object({}),
      run: async ({ inputs }) => ({ valeur: inputs.valeur }),
    });
    const { evenements, observateur } = observateurEspion();
    const avecCycle: GrapheWorkflow = {
      noeuds: [
        { id: 'a', type: 'test.relais', parametres: {} },
        { id: 'b', type: 'test.relais', parametres: {} },
      ],
      connexions: [
        { id: 'ab', source: 'a', sourcePort: 'valeur', cible: 'b', ciblePort: 'valeur' },
        { id: 'ba', source: 'b', sourcePort: 'valeur', cible: 'a', ciblePort: 'valeur' },
      ],
    };

    const erreur = await executerWorkflow({
      graphe: avecCycle,
      registre: new RegistreNoeuds({ definitions: [noeudRelais] }),
      contexte: CONTEXTE,
      observateur,
    }).catch((raison: unknown) => raison);

    expect(erreur).toBeInstanceOf(WorkflowInvalideErreur);
    expect((erreur as WorkflowInvalideErreur).erreurs).toContainEqual(
      expect.objectContaining({ code: 'cycle', connexionId: 'ba' }),
    );
    expect(evenements).toEqual([]);
  });

  it('rejette une sortie non conforme au type déclaré par le nœud', async () => {
    const noeudMenteur = defineNode({
      id: 'test.menteur',
      categorie: 'analyse',
      libelle: 'Menteur',
      description: 'Déclare un nombre mais renvoie du texte',
      entrees: {},
      sorties: { nombre: { type: 'nombre', libelle: 'Nombre' } },
      parametres: z.object({}),
      run: async () => ({ nombre: 'pas un nombre' }) as unknown as { nombre: number },
    });
    const { observateur } = observateurEspion();

    const resultat = await executerWorkflow({
      graphe: { noeuds: [{ id: 'm', type: 'test.menteur', parametres: {} }], connexions: [] },
      registre: new RegistreNoeuds({ definitions: [noeudMenteur] }),
      contexte: CONTEXTE,
      observateur,
    });

    expect(resultat).toMatchObject({ statut: 'erreur', noeudId: 'm' });
  });
});

describe('RegistreNoeuds', () => {
  it('refuse deux nœuds de même identifiant', () => {
    const registre = creerRegistreNoeuds();
    const definition = registre.obtenir({ type: 'factice.nombre' });

    expect(definition).toBeDefined();
    expect(
      () => new RegistreNoeuds({ definitions: definition ? [definition, definition] : [] }),
    ).toThrow(/deux fois/);
  });

  it('décrit les nœuds pour l’éditeur, avec leurs paramètres par défaut', () => {
    const descripteurs = creerRegistreNoeuds().decrire();

    expect(descripteurs).toContainEqual(
      expect.objectContaining({
        id: 'factice.nombre',
        categorie: 'collecte',
        parametresParDefaut: { valeur: 42, dureeMs: 800 },
      }),
    );
    expect(
      descripteurs.find((descripteur) => descripteur.id === 'standardisation.reprojection'),
    ).toMatchObject({
      categorie: 'standardisation',
      parametresParDefaut: { crsCible: 'EPSG:2154' },
    });
  });
});
