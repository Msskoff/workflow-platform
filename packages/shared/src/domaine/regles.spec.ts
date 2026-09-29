import { datesCampagneCoherentes } from './campagne';
import { peutTransitionner } from './commun';
import { creerDecisionSchema, transitionsStatutDecision } from './decision';
import { transitionsStatutExecution } from './execution-workflow';
import { workflowSnapshotSchema } from './workflow-snapshot';

describe('transitions de statut', () => {
  it('une décision avance brouillon → validé → envoyé, sans retour', () => {
    const transitions = transitionsStatutDecision;

    expect(peutTransitionner({ transitions, depuis: 'brouillon', vers: 'validé' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'validé', vers: 'envoyé' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'brouillon', vers: 'envoyé' })).toBe(false);
    expect(peutTransitionner({ transitions, depuis: 'envoyé', vers: 'brouillon' })).toBe(false);
  });

  it("une exécution terminée n'évolue plus", () => {
    const transitions = transitionsStatutExecution;

    expect(peutTransitionner({ transitions, depuis: 'en_attente', vers: 'en_cours' })).toBe(true);
    expect(peutTransitionner({ transitions, depuis: 'terminee', vers: 'en_cours' })).toBe(false);
  });
});

describe('règles de validation', () => {
  it('refuse une campagne qui finit avant de commencer', () => {
    expect(datesCampagneCoherentes({ dateDebut: '2026-03-01', dateFin: '2026-02-01' })).toBe(false);
    expect(datesCampagneCoherentes({ dateDebut: '2026-03-01', dateFin: null })).toBe(true);
  });

  it('refuse une explication sur plusieurs lignes', () => {
    const resultat = creerDecisionSchema.safeParse({
      executionId: 'exe',
      noeudIds: ['n1'],
      explication: 'Irriguer demain.\nPuis surveiller.',
    });

    expect(resultat.success).toBe(false);
  });

  it('refuse un snapshot dont une connexion vise un nœud absent', () => {
    const resultat = workflowSnapshotSchema.safeParse({
      workflowId: 'wf',
      nom: 'Test',
      version: 1,
      noeuds: [{ id: 'n1', type: 'collecte.gps' }],
      connexions: [{ id: 'c1', source: 'n1', cible: 'n2' }],
    });

    expect(resultat.success).toBe(false);
  });
});
