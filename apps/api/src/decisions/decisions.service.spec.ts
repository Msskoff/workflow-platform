import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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

  describe('cycle d’application (prévu → réel)', () => {
    /** Signature PNG suivie de quelques octets : suffisant pour le contrôle de format. */
    const PHOTO_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

    async function decisionEnvoyee(): Promise<string> {
      const executionId = await executionTerminee();
      const { id } = await service.creer({
        donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
      });
      await service.modifier({
        id,
        donnees: {
          statut: 'validé',
          prevu: { produit: 'Eau', dose: 20, uniteDose: 'mm', date: '2026-10-01', coutEstime: 150 },
        },
      });
      await service.modifier({ id, donnees: { statut: 'envoyé' } });
      return id;
    }

    it('fige le prévu une fois la décision envoyée', async () => {
      const id = await decisionEnvoyee();

      expect((await service.trouver({ id })).prevu).toEqual({
        produit: 'Eau',
        dose: 20,
        uniteDose: 'mm',
        date: '2026-10-01',
        coutEstime: 150,
      });
      await expect(service.modifier({ id, donnees: { prevu: { dose: 25 } } })).rejects.toThrow(
        ConflictException,
      );
    });

    it('passe envoyé → appliqué avec le réel et sa photo', async () => {
      const id = await decisionEnvoyee();

      const appliquee = await service.modifier({
        id,
        donnees: {
          statut: 'appliqué',
          reel: {
            produit: 'Eau',
            dose: 18,
            uniteDose: 'mm',
            date: '2026-10-02',
            cout: 140,
            photo: { type: 'image/png', base64: PHOTO_PNG.toString('base64') },
          },
        },
      });

      expect(appliquee).toMatchObject({
        statut: 'appliqué',
        applicationDeclareePar: 'equipe',
        reel: { dose: 18, date: '2026-10-02', cout: 140, photo: true },
      });
      expect(appliquee.appliqueeLe).not.toBeNull();
      expect(await service.photo({ id })).toEqual({ contenu: PHOTO_PNG, type: 'image/png' });

      // Photo retirée, le reste du réel est conservé.
      const sansPhoto = await service.modifier({
        id,
        donnees: { reel: { date: '2026-10-02', photo: null } },
      });
      expect(sansPhoto.reel).toMatchObject({ dose: 18, photo: false });
      await expect(service.photo({ id })).rejects.toThrow(NotFoundException);
    });

    it('refuse le réel pour une décision qui n’est pas appliquée', async () => {
      const id = await decisionEnvoyee();

      await expect(
        service.modifier({ id, donnees: { reel: { date: '2026-10-02' } } }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.modifier({
          id,
          donnees: {
            statut: 'non_appliqué',
            motifNonApplication: 'Matériel en panne',
            reel: { date: '2026-10-02' },
          },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuse de déclarer appliquée une décision pas encore envoyée', async () => {
      const executionId = await executionTerminee();
      const { id } = await service.creer({
        donnees: { executionId, noeudIds: ['regle'], explication: EXPLICATION },
      });
      await service.modifier({ id, donnees: { statut: 'validé' } });

      await expect(service.modifier({ id, donnees: { statut: 'appliqué' } })).rejects.toThrow(
        ConflictException,
      );
    });

    it('exige un motif pour non_appliqué, puis permet une application tardive', async () => {
      const id = await decisionEnvoyee();

      await expect(service.modifier({ id, donnees: { statut: 'non_appliqué' } })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.modifier({ id, donnees: { motifNonApplication: 'Pluie' } }),
      ).rejects.toThrow(BadRequestException);
      const nonAppliquee = await service.modifier({
        id,
        donnees: { statut: 'non_appliqué', motifNonApplication: 'Pluie de 30 mm la veille' },
      });
      expect(nonAppliquee).toMatchObject({
        statut: 'non_appliqué',
        motifNonApplication: 'Pluie de 30 mm la veille',
      });
      expect(nonAppliquee.nonAppliqueeLe).not.toBeNull();

      await expect(service.modifier({ id, donnees: { statut: 'envoyé' } })).rejects.toThrow(
        ConflictException,
      );
      const tardive = await service.modifier({ id, donnees: { statut: 'appliqué' } });
      expect(tardive.statut).toBe('appliqué');
    });

    it('annule une application déclarée sans réel, jamais une fois le réel saisi', async () => {
      const id = await decisionEnvoyee();
      await service.modifier({ id, donnees: { statut: 'appliqué' }, declarant: 'espace_client' });

      const annulee = await service.modifier({ id, donnees: { statut: 'envoyé' } });
      expect(annulee).toMatchObject({
        statut: 'envoyé',
        appliqueeLe: null,
        applicationDeclareePar: null,
      });
      // La date d'envoi d'origine est conservée.
      expect(annulee.envoyeeLe).not.toBeNull();

      await service.modifier({ id, donnees: { statut: 'appliqué', reel: { date: '2026-10-03' } } });
      await expect(service.modifier({ id, donnees: { statut: 'envoyé' } })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.modifier({ id, donnees: { statut: 'non_appliqué' } })).rejects.toThrow();
    });

    it('refuse une photo dont le contenu ne correspond pas au type annoncé', async () => {
      const id = await decisionEnvoyee();

      await expect(
        service.modifier({
          id,
          donnees: {
            statut: 'appliqué',
            reel: {
              date: '2026-10-02',
              photo: { type: 'image/jpeg', base64: PHOTO_PNG.toString('base64') },
            },
          },
        }),
      ).rejects.toThrow(BadRequestException);
      // Rien n'a été enregistré.
      expect((await service.trouver({ id })).statut).toBe('envoyé');
    });
  });
});
