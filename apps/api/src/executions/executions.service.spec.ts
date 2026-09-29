import { BadRequestException, ConflictException } from '@nestjs/common';
import { calculerEmpreinte } from '../common/empreinte';
import { causeSqlite } from '../common/erreurs';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { capturerErreur } from '../test/capturer-erreur';
import { creerExecution, creerJeuDeDonnees, SNAPSHOT_TEST } from '../test/jeu-de-donnees';
import { ExecutionsService } from './executions.service';

describe('ExecutionsService', () => {
  let base: BaseDeTest;
  let service: ExecutionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new ExecutionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('versionne les exécutions par campagne et par workflow, et fige le snapshot', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });

    const premiere = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });
    const seconde = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });

    expect([premiere.version, seconde.version]).toEqual([1, 2]);
    expect(premiere).toMatchObject({
      statut: 'en_attente',
      workflowId: SNAPSHOT_TEST.workflowId,
      snapshot: SNAPSHOT_TEST,
      empreinteSnapshot: calculerEmpreinte({ valeur: SNAPSHOT_TEST }),
    });
  });

  it('suit le cycle en_attente → en_cours → terminee et date chaque étape', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });

    const enCours = await service.modifier({ id: execution.id, donnees: { statut: 'en_cours' } });
    const terminee = await service.modifier({ id: execution.id, donnees: { statut: 'terminee' } });

    expect(enCours.demarreeLe).not.toBeNull();
    expect(terminee.termineeLe).not.toBeNull();
    await expect(
      service.modifier({ id: execution.id, donnees: { statut: 'en_cours' } }),
    ).rejects.toThrow(ConflictException);
  });

  it("n'accepte une erreur que pour un échec", async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });

    await expect(
      service.modifier({ id: execution.id, donnees: { statut: 'en_cours', erreur: 'x' } }),
    ).rejects.toThrow(BadRequestException);

    const echouee = await service.modifier({
      id: execution.id,
      donnees: { statut: 'echouee', erreur: 'Image Sentinel-2 indisponible' },
    });
    expect(echouee).toMatchObject({ statut: 'echouee', erreur: 'Image Sentinel-2 indisponible' });
  });

  it('refuse toute modification du snapshot au niveau de la base', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });

    const erreur = await capturerErreur({
      promesse: base.prisma.executionWorkflow.update({
        where: { id: execution.id },
        data: { snapshot: { ...SNAPSHOT_TEST, nom: 'Modifié' } },
      }),
    });

    expect(causeSqlite({ erreur }).originalMessage).toMatch(/figés/);
    expect((await service.trouver({ id: execution.id })).snapshot).toEqual(SNAPSHOT_TEST);
  });
});
