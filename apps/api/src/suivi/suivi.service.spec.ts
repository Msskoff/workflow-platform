import { NotFoundException } from '@nestjs/common';
import { DecisionsService } from '../decisions/decisions.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { executerDiagnostic } from '../test/diagnostic';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { SuiviService } from './suivi.service';

describe('SuiviService', () => {
  let base: BaseDeTest;
  let suivi: SuiviService;
  let decisions: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    suivi = new SuiviService(base.prisma);
    decisions = new DecisionsService(base.prisma);
  });

  afterAll(() => base.fermer());

  it('dit ce qui a été conseillé, appliqué, et ce qui reste à faire', async () => {
    const { campagne, parcelle } = await creerJeuDeDonnees({ prisma: base.prisma });
    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });
    const [appliquee, nonAppliquee, aFaire, rejetee] = await decisions.lister({
      filtre: { executionId: execution.id },
    });
    const envoyer = async ({ id, coutEstime }: { id: string; coutEstime: number }) => {
      await decisions.modifier({
        id,
        donnees: {
          statut: 'validé',
          prevu: { produit: 'Azote', dose: 100, uniteDose: 'kg/ha', coutEstime },
        },
      });
      await decisions.modifier({ id, donnees: { statut: 'envoyé' } });
    };
    await envoyer({ id: appliquee?.id ?? '', coutEstime: 400 });
    await envoyer({ id: nonAppliquee?.id ?? '', coutEstime: 100 });
    await envoyer({ id: aFaire?.id ?? '', coutEstime: 100 });
    await decisions.modifier({ id: rejetee?.id ?? '', donnees: { statut: 'rejeté' } });
    await decisions.modifier({
      id: appliquee?.id ?? '',
      donnees: {
        statut: 'appliqué',
        reel: { date: '2026-10-05', dose: 90, uniteDose: 'kg/ha', cout: 360 },
      },
    });
    await decisions.modifier({
      id: nonAppliquee?.id ?? '',
      donnees: { statut: 'non_appliqué', motifNonApplication: 'Sol trop humide' },
    });

    const detail = await suivi.detail({ campagneId: campagne.id });

    expect(detail.parcelle.id).toBe(parcelle.id);
    // La décision rejetée n'a jamais été conseillée : elle n'apparaît pas.
    expect(detail.decisions.map((element) => element.decision.statut).sort()).toEqual([
      'appliqué',
      'envoyé',
      'non_appliqué',
    ]);
    expect(detail.decisions[0]?.analyse).toMatchObject({ id: execution.id, version: 1 });
    expect(detail.indicateurs).toMatchObject({
      conseillees: 3,
      appliquees: 1,
      nonAppliquees: 1,
      aFaire: 1,
      enPreparation: 0,
      tauxApplicationPourcent: 33.3,
      coutPrevu: 400,
      coutReel: 360,
      ecartCoutPourcent: -10,
      ecartDoseMoyenPourcent: -10,
    });

    const resume = (await suivi.lister()).find((ligne) => ligne.campagne.id === campagne.id);
    expect(resume?.indicateurs).toEqual(detail.indicateurs);
  });

  it('signale une campagne inconnue', async () => {
    await expect(suivi.detail({ campagneId: 'inconnue' })).rejects.toThrow(NotFoundException);
  });
});
