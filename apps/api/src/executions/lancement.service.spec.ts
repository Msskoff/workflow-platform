import { ConflictException } from '@nestjs/common';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import {
  creerExecution,
  creerExecutionsService,
  creerJeuDeDonnees,
  SNAPSHOT_TEST,
} from '../test/jeu-de-donnees';
import { LancementService } from './lancement.service';

describe('LancementService', () => {
  let base: BaseDeTest;
  let service: LancementService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new LancementService(
      base.prisma,
      creerRegistreNoeuds(),
      creerExecutionsService({ prisma: base.prisma }),
    );
  });

  afterAll(() => base.fermer());

  it('exécute le workflow et enregistre statut et sorties de chaque nœud', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { id } = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });

    const execution = await service.executer({ id });

    expect(execution.statut).toBe('terminee');
    expect(execution.noeuds).toMatchObject([
      { noeudId: 'mesure', statut: 'ok', sorties: { nombre: 25 }, erreur: null },
      { noeudId: 'regle', statut: 'ok', sorties: { depasse: true, message: '25 > seuil 20' } },
    ]);
    expect(execution.noeuds.every((etat) => etat.demarreLe && etat.termineLe)).toBe(true);
  });

  it('marque le nœud fautif en erreur, laisse la suite en attente et fait échouer l’exécution', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const [mesure, regle] = SNAPSHOT_TEST.noeuds;
    if (!mesure || !regle) {
      throw new Error('SNAPSHOT_TEST incomplet');
    }
    const snapshot = {
      ...SNAPSHOT_TEST,
      noeuds: [
        { ...mesure, parametres: { valeur: -5, dureeMs: 0 } },
        regle,
        { id: 'aval', type: 'factice.seuil', parametres: { dureeMs: 0 } },
      ],
      connexions: [
        ...SNAPSHOT_TEST.connexions,
        { id: 'c2', source: 'mesure', sourcePort: 'nombre', cible: 'aval', ciblePort: 'valeur' },
      ],
    };
    const { id } = await creerExecution({ prisma: base.prisma, campagneId: campagne.id, snapshot });

    const execution = await service.executer({ id });

    expect(execution.statut).toBe('echouee');
    expect(execution.erreur).toMatch(/^regle : Valeur négative/);
    expect(execution.noeuds.map(({ noeudId, statut }) => `${noeudId}:${statut}`)).toEqual([
      'mesure:ok',
      'regle:erreur',
      'aval:en_attente',
    ]);
  });

  it('refuse de relancer une exécution déjà lancée', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { id } = await creerExecution({ prisma: base.prisma, campagneId: campagne.id });
    await service.executer({ id });

    await expect(service.lancer({ id })).rejects.toThrow(ConflictException);
  });
});
