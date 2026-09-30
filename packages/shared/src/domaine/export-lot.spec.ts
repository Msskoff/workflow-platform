import { FORMAT_EXPORT_WORKFLOW, lireExportWorkflow } from './export-workflow';
import { calculerProgression } from './lot';

const EXPORT_VALIDE = {
  format: FORMAT_EXPORT_WORKFLOW,
  version: 1,
  exporteLe: '2026-09-30T12:00:00.000Z',
  workflow: {
    nom: 'Essai',
    graphe: {
      noeuds: [{ id: 'n1', type: 'factice.nombre', parametres: {} }],
      connexions: [],
    },
  },
};

describe('export de workflow', () => {
  it('lit un export valide et complète les champs facultatifs', () => {
    const resultat = lireExportWorkflow({ contenu: EXPORT_VALIDE });

    expect(resultat.ok).toBe(true);
    expect(resultat.ok && resultat.export.workflow).toMatchObject({
      description: '',
      culture: null,
      graphe: { variables: [] },
    });
  });

  it('refuse un fichier qui n’est pas un export de workflow', () => {
    expect(lireExportWorkflow({ contenu: [1, 2] })).toEqual({
      ok: false,
      erreurs: ['Le fichier ne contient pas un objet JSON.'],
    });
    expect(lireExportWorkflow({ contenu: { nom: 'x' } })).toEqual({
      ok: false,
      erreurs: [
        "Ce fichier n'est pas un export de workflow : champ « format » attendu « workflow-platform/workflow », reçu null.",
      ],
    });
  });

  it('refuse explicitement une version inconnue', () => {
    expect(lireExportWorkflow({ contenu: { ...EXPORT_VALIDE, version: 2 } })).toEqual({
      ok: false,
      erreurs: ["Version d'export 2 non prise en charge (versions acceptées : 1)."],
    });
  });

  it('donne le chemin de chaque erreur de schéma', () => {
    const resultat = lireExportWorkflow({
      contenu: {
        ...EXPORT_VALIDE,
        workflow: {
          nom: 'Essai',
          graphe: {
            noeuds: [{ id: 'n1', type: 'factice.nombre', parametres: {} }],
            connexions: [
              { id: 'c1', source: 'n1', sourcePort: 'x', cible: 'fantome', ciblePort: 'y' },
            ],
          },
        },
      },
    });

    expect(resultat).toEqual({
      ok: false,
      erreurs: [
        'workflow.graphe.connexions.0.cible : La connexion référence un nœud inexistant : fantome',
      ],
    });
  });
});

describe('progression d’un lot', () => {
  it('compte les tâches et donne le statut global', () => {
    expect(
      calculerProgression({ statuts: ['reussie', 'echouee', 'en_cours', 'en_attente'] }),
    ).toEqual({
      progression: {
        total: 4,
        enAttente: 1,
        enCours: 1,
        reussies: 1,
        echouees: 1,
        pourcentage: 50,
      },
      statut: 'en_cours',
    });
    expect(calculerProgression({ statuts: ['reussie', 'echouee'] }).statut).toBe(
      'termine_avec_echecs',
    );
    expect(calculerProgression({ statuts: ['reussie', 'reussie'] }).statut).toBe('termine');
  });
});
