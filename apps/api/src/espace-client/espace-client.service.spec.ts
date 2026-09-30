import { NotFoundException } from '@nestjs/common';
import { DecisionsService } from '../decisions/decisions.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecutionTerminee } from '../test/jeu-de-donnees';
import { EspaceClientService } from './espace-client.service';

describe('EspaceClientService', () => {
  let base: BaseDeTest;
  let espaceClient: EspaceClientService;
  let decisions: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    espaceClient = new EspaceClientService(base.prisma);
    decisions = new DecisionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('ne montre au client que les décisions envoyées, sans données internes', async () => {
    const { executionId, jeu } = await creerExecutionTerminee({ prisma: base.prisma });
    const creer = (explication: string) =>
      decisions.creer({
        donnees: {
          executionId,
          noeudIds: ['regle'],
          explication,
          recommandation: 'Irriguer 20 mm.',
          donnees: { valeur: 25 },
        },
      });
    const [brouillon, validee, envoyee, rejetee] = await Promise.all(
      ['Brouillon.', 'Validée.', 'Envoyée.', 'Rejetée.'].map((explication) => creer(explication)),
    );
    await decisions.modifier({ id: validee?.id ?? '', donnees: { statut: 'validé' } });
    await decisions.modifier({ id: envoyee?.id ?? '', donnees: { statut: 'validé' } });
    await decisions.modifier({ id: envoyee?.id ?? '', donnees: { statut: 'envoyé' } });
    await decisions.modifier({ id: rejetee?.id ?? '', donnees: { statut: 'rejeté' } });

    const visibles = await espaceClient.decisionsEnvoyees({ clientId: jeu.client.id });

    expect(brouillon?.statut).toBe('brouillon');
    expect(visibles).toEqual([
      {
        id: envoyee?.id,
        parcelle: { id: jeu.parcelle.id, nom: 'Les Grands Champs' },
        campagne: { id: jeu.campagne.id, nom: 'Blé 2026' },
        recommandation: 'Irriguer 20 mm.',
        explication: 'Envoyée.',
        priorite: null,
        envoyeeLe: expect.any(String),
      },
    ]);
  });

  it('ne mélange pas les clients et signale un client inconnu', async () => {
    const autre = await creerExecutionTerminee({ prisma: base.prisma });

    expect(await espaceClient.decisionsEnvoyees({ clientId: autre.jeu.client.id })).toEqual([]);
    await expect(espaceClient.decisionsEnvoyees({ clientId: 'inconnu' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
