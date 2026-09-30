import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { DecisionsService } from '../decisions/decisions.service';
import { RapportsService } from '../rapports/rapports.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { executerDiagnostic } from '../test/diagnostic';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { EspaceClientService } from './espace-client.service';

describe('EspaceClientService', () => {
  let base: BaseDeTest;
  let espaceClient: EspaceClientService;
  let clients: ClientsService;
  let decisions: DecisionsService;

  beforeAll(() => {
    base = creerBaseDeTest();
    decisions = new DecisionsService(base.prisma);
    espaceClient = new EspaceClientService(
      base.prisma,
      new RapportsService(base.prisma),
      decisions,
    );
    clients = new ClientsService(base.prisma);
  });

  afterAll(() => base.fermer());

  async function envoyer({ id }: { id: string }): Promise<void> {
    await decisions.modifier({ id, donnees: { statut: 'validé' } });
    await decisions.modifier({ id, donnees: { statut: 'envoyé' } });
  }

  it('n’ouvre l’espace qu’avec un lien valide, et le nouveau lien révoque l’ancien', async () => {
    const { client } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton: ancien } = await clients.genererAcces({ id: client.id });
    const { jeton } = await clients.genererAcces({ id: client.id });

    expect((await clients.trouver({ id: client.id })).accesActif).toBe(true);
    expect((await espaceClient.vue({ jeton })).client.nom).toBe('EARL des Tilleuls');
    await expect(espaceClient.vue({ jeton: ancien })).rejects.toThrow(NotFoundException);
    await expect(espaceClient.vue({ jeton: 'inventé' })).rejects.toThrow(NotFoundException);
  });

  it('ne montre une analyse et ses décisions qu’une fois envoyées', async () => {
    const { client, parcelle, campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton } = await clients.genererAcces({ id: client.id });
    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });
    const produites = await decisions.lister({ filtre: { executionId: execution.id } });

    const avant = await espaceClient.vueParcelle({ jeton, parcelleId: parcelle.id });
    expect(avant.analyses).toEqual([]);
    expect(avant.decisions).toEqual([]);
    expect((await espaceClient.vue({ jeton })).parcelles[0]?.derniereAnalyse).toBeNull();

    const [envoyee, validee] = produites;
    await envoyer({ id: envoyee?.id ?? '' });
    await decisions.modifier({ id: validee?.id ?? '', donnees: { statut: 'validé' } });

    const apres = await espaceClient.vueParcelle({ jeton, parcelleId: parcelle.id });
    expect(apres.analyses).toHaveLength(1);
    expect(apres.analyses[0]?.rapport.carte.zonage?.zones).toHaveLength(3);
    expect(apres.decisions).toEqual([
      expect.objectContaining({ id: envoyee?.id, analyseId: execution.id }),
    ]);
    // L'analyse et sa décision renvoient à l'exécution : la frise permet de rouvrir l'analyse.
    expect(apres.chronologie.map(({ type, analyseId }) => ({ type, analyseId }))).toEqual([
      { type: 'debut_campagne', analyseId: null },
      { type: 'analyse', analyseId: execution.id },
      { type: 'decision', analyseId: execution.id },
    ]);
    const pdf = await espaceClient.rapportPdf({ jeton, parcelleId: parcelle.id });
    expect(pdf.contenu.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('permet de comparer deux analyses de dates différentes', async () => {
    const { client, parcelle, campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton } = await clients.genererAcces({ id: client.id });
    for (const image of ['sentinel2-parcelle.tif', 'sentinel2-parcelle-juin.tif']) {
      const execution = await executerDiagnostic({
        prisma: base.prisma,
        campagneId: campagne.id,
        image,
      });
      const [premiere] = await decisions.lister({ filtre: { executionId: execution.id } });
      await envoyer({ id: premiere?.id ?? '' });
    }

    const { analyses } = await espaceClient.vueParcelle({ jeton, parcelleId: parcelle.id });

    expect(analyses).toHaveLength(2);
    const [recente, ancienne] = analyses;
    // Juin : végétation plus développée que début de printemps.
    expect(recente?.rapport.indicateurs.ndviMoyen).toBeGreaterThan(
      ancienne?.rapport.indicateurs.ndviMoyen ?? Infinity,
    );
  });

  it('laisse le fermier cocher puis décocher « fait », tant que le réel n’est pas saisi', async () => {
    const { client, parcelle, campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton } = await clients.genererAcces({ id: client.id });
    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });
    const [premiere, brouillon] = await decisions.lister({ filtre: { executionId: execution.id } });
    const decisionId = premiere?.id ?? '';
    await envoyer({ id: decisionId });

    // Un brouillon n'existe pas pour le client.
    await expect(
      espaceClient.marquerFait({ jeton, decisionId: brouillon?.id ?? '', donnees: { fait: true } }),
    ).rejects.toThrow(NotFoundException);

    const cochee = await espaceClient.marquerFait({ jeton, decisionId, donnees: { fait: true } });
    expect(cochee).toMatchObject({ fait: true, faitConfirme: false });
    expect(cochee.faitLe).not.toBeNull();
    expect(await decisions.trouver({ id: decisionId })).toMatchObject({
      statut: 'appliqué',
      applicationDeclareePar: 'espace_client',
    });
    const { chronologie } = await espaceClient.vueParcelle({ jeton, parcelleId: parcelle.id });
    expect(chronologie.map((evenement) => evenement.type)).toContain('application');

    const decochee = await espaceClient.marquerFait({
      jeton,
      decisionId,
      donnees: { fait: false },
    });
    expect(decochee).toMatchObject({ fait: false, faitLe: null });
    expect((await decisions.trouver({ id: decisionId })).statut).toBe('envoyé');

    // L'équipe confirme avec le réel : la case ne se décoche plus.
    await decisions.modifier({
      id: decisionId,
      donnees: { statut: 'appliqué', reel: { date: '2026-10-02', dose: 80, uniteDose: 'kg/ha' } },
    });
    const confirmee = await espaceClient.marquerFait({
      jeton,
      decisionId,
      donnees: { fait: true },
    });
    expect(confirmee).toMatchObject({ fait: true, faitLe: '2026-10-02', faitConfirme: true });
    await expect(
      espaceClient.marquerFait({ jeton, decisionId, donnees: { fait: false } }),
    ).rejects.toThrow(ConflictException);
  });

  it('cloisonne les clients', async () => {
    const premier = await creerJeuDeDonnees({ prisma: base.prisma });
    const second = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton } = await clients.genererAcces({ id: premier.client.id });
    const execution = await executerDiagnostic({
      prisma: base.prisma,
      campagneId: second.campagne.id,
    });
    const [autre] = await decisions.lister({ filtre: { executionId: execution.id } });
    await envoyer({ id: autre?.id ?? '' });

    await expect(
      espaceClient.vueParcelle({ jeton, parcelleId: second.parcelle.id }),
    ).rejects.toThrow(NotFoundException);
    // Un client ne peut pas cocher la recommandation d'un autre.
    await expect(
      espaceClient.marquerFait({ jeton, decisionId: autre?.id ?? '', donnees: { fait: true } }),
    ).rejects.toThrow(NotFoundException);
  });
});
