import { BadRequestException, ConflictException } from '@nestjs/common';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecutionsService, creerExecutionTerminee } from '../test/jeu-de-donnees';
import { DecisionsService } from './decisions.service';

const EXPLICATION = "Irriguer 20 mm sous 48 h car l'humidité du sol est passée sous 20 %.";

describe('DecisionsService', () => {
  let base: BaseDeTest;
  let service: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new DecisionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  async function executionTerminee(): Promise<string> {
    const { executionId } = await creerExecutionTerminee({ prisma: base.prisma });
    return executionId;
  }

  it('rejette un brouillon avec un motif, puis le fige', async () => {
    const executionId = await executionTerminee();
    const { id } = await service.creer({
      donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
    });

    await expect(
      service.modifier({ id, donnees: { motifRejet: 'Sonde défaillante' } }),
    ).rejects.toThrow(BadRequestException);
    const rejetee = await service.modifier({
      id,
      donnees: { statut: 'rejeté', motifRejet: 'Sonde défaillante' },
    });

    expect(rejetee).toMatchObject({ statut: 'rejeté', motifRejet: 'Sonde défaillante' });
    expect(rejetee.rejeteeLe).not.toBeNull();
    await expect(service.modifier({ id, donnees: { statut: 'validé' } })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.modifier({ id, donnees: { explication: 'Autre.' } })).rejects.toThrow(
      ConflictException,
    );
  });

  it('ne rejette pas une décision déjà validée', async () => {
    const executionId = await executionTerminee();
    const { id } = await service.creer({
      donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
    });
    await service.modifier({ id, donnees: { statut: 'validé' } });

    await expect(service.modifier({ id, donnees: { statut: 'rejeté' } })).rejects.toThrow(
      ConflictException,
    );
  });

  it('crée un brouillon qui référence les nœuds producteurs', async () => {
    const executionId = await executionTerminee();

    const decision = await service.creer({
      donnees: { executionId, noeudIds: ['mesure', 'regle'], explication: EXPLICATION },
    });

    expect(decision).toMatchObject({
      executionId,
      noeudIds: ['mesure', 'regle'],
      explication: EXPLICATION,
      statut: 'brouillon',
      valideeLe: null,
      envoyeeLe: null,
    });
  });

  it('refuse un nœud absent du snapshot de l’exécution', async () => {
    const executionId = await executionTerminee();

    await expect(
      service.creer({ donnees: { executionId, noeudIds: ['inconnu'], explication: EXPLICATION } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('avance brouillon → validé → envoyé puis fige la décision', async () => {
    const executionId = await executionTerminee();
    const { id } = await service.creer({
      donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
    });

    await expect(service.modifier({ id, donnees: { statut: 'envoyé' } })).rejects.toThrow(
      ConflictException,
    );
    const validee = await service.modifier({ id, donnees: { statut: 'validé' } });
    const envoyee = await service.modifier({ id, donnees: { statut: 'envoyé' } });

    expect(validee.valideeLe).not.toBeNull();
    expect(envoyee).toMatchObject({ statut: 'envoyé' });
    expect(envoyee.envoyeeLe).not.toBeNull();
    await expect(
      service.modifier({ id, donnees: { explication: 'Autre phrase.' } }),
    ).rejects.toThrow(ConflictException);
    await expect(service.modifier({ id, donnees: { statut: 'brouillon' } })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.supprimer({ id })).rejects.toThrow(ConflictException);
  });

  it("empêche de supprimer l'exécution qui a produit une décision", async () => {
    const executionId = await executionTerminee();
    await service.creer({
      donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
    });

    await expect(
      creerExecutionsService({ prisma: base.prisma }).supprimer({ id: executionId }),
    ).rejects.toThrow(ConflictException);
  });
});
