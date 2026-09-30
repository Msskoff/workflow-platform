import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecutionTerminee } from '../test/jeu-de-donnees';
import { DecisionsService } from './decisions.service';
import { RevueService } from './revue.service';

describe('RevueService', () => {
  let base: BaseDeTest;
  let revue: RevueService;
  let decisions: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    revue = new RevueService(base.prisma, creerRegistreNoeuds());
    decisions = new DecisionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('donne chaque décision avec son client, sa parcelle, sa campagne et sa chaîne nommée', async () => {
    const { executionId, jeu } = await creerExecutionTerminee({ prisma: base.prisma });
    const decision = await decisions.creer({
      donnees: {
        executionId,
        noeudIds: ['mesure', 'regle'],
        explication: 'La mesure dépasse le seuil.',
        recommandation: 'Irriguer.',
        donnees: { indicateur: 'nombre', valeur: 25, operateur: '>', seuil: 20 },
      },
    });

    const [enRevue] = await revue.lister({ filtre: { clientId: jeu.client.id } });

    expect(enRevue).toMatchObject({
      decision: { id: decision.id, statut: 'brouillon', recommandation: 'Irriguer.' },
      execution: { id: executionId, version: 1, workflowNom: 'Irrigation' },
      campagne: { id: jeu.campagne.id, nom: 'Blé 2026' },
      parcelle: { id: jeu.parcelle.id, nom: 'Les Grands Champs' },
      client: { id: jeu.client.id, nom: 'EARL des Tilleuls' },
      chaine: [
        { noeudId: 'mesure', type: 'factice.nombre', libelle: 'Nombre (factice)' },
        { noeudId: 'regle', type: 'factice.seuil', libelle: 'Seuil (factice)' },
      ],
    });
  });

  it('filtre par statut', async () => {
    const { executionId, jeu } = await creerExecutionTerminee({ prisma: base.prisma });
    const [a, b] = await Promise.all(
      ['Première.', 'Seconde.'].map((explication) =>
        decisions.creer({ donnees: { executionId, noeudIds: ['regle'], explication } }),
      ),
    );
    await decisions.modifier({ id: b?.id ?? '', donnees: { statut: 'validé' } });

    const brouillons = await revue.lister({
      filtre: { clientId: jeu.client.id, statut: 'brouillon' },
    });
    const validees = await revue.lister({ filtre: { clientId: jeu.client.id, statut: 'validé' } });

    expect(brouillons.map((item) => item.decision.id)).toEqual([a?.id]);
    expect(validees.map((item) => item.decision.id)).toEqual([b?.id]);
  });
});
