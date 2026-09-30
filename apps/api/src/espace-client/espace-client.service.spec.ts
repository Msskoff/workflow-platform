import { NotFoundException } from '@nestjs/common';
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
    espaceClient = new EspaceClientService(base.prisma, new RapportsService(base.prisma));
    clients = new ClientsService(base.prisma);
    decisions = new DecisionsService(base.prisma);
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

  it('cloisonne les clients', async () => {
    const premier = await creerJeuDeDonnees({ prisma: base.prisma });
    const second = await creerJeuDeDonnees({ prisma: base.prisma });
    const { jeton } = await clients.genererAcces({ id: premier.client.id });

    await expect(
      espaceClient.vueParcelle({ jeton, parcelleId: second.parcelle.id }),
    ).rejects.toThrow(NotFoundException);
  });
});
