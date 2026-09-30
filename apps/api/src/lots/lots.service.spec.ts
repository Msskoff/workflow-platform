import { BadRequestException } from '@nestjs/common';
import type { GeometrieParcelle } from '@workflow/shared';
import { CampagnesService } from '../campagnes/campagnes.service';
import { ClientsService } from '../clients/clients.service';
import { LancementService } from '../executions/lancement.service';
import { DIAGNOSTIC_PAR_LOT } from '../modeles/modeles-predefinis';
import { ModelesService } from '../modeles/modeles.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { ParcellesService } from '../parcelles/parcelles.service';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecutionsService, GEOMETRIE_TEST } from '../test/jeu-de-donnees';
import { lireExempleBase64, lireExempleJson } from '../test/noeuds';
import { ExecuteurLots } from './executeur-lots.service';
import { LotsService, MESSAGE_SANS_CAMPAGNE } from './lots.service';

/** Contour couvert par l'image d'exemple (nord de la France). */
const CONTOUR_COUVERT = (
  lireExempleJson({ nom: 'parcelle-contour.geojson' }) as {
    geometry: GeometrieParcelle;
  }
).geometry;

const VALEURS = {
  image: lireExempleBase64({ nom: 'sentinel2-parcelle.tif' }),
  dateDebut: '2026-04-01',
  dateFin: '2026-04-30',
};

describe('Exécution par lot', () => {
  let base: BaseDeTest;
  let lots: LotsService;
  let executeur: ExecuteurLots;
  let campagnes: CampagnesService;
  let parcelles: ParcellesService;
  let modeleId: string;
  let clientId: string;

  beforeAll(async () => {
    // Relances immédiates : le test déroule toutes les tentatives sans attendre.
    process.env.LOTS_DELAI_RELANCE_MS = '0';
    base = creerBaseDeTest();
    const registre = creerRegistreNoeuds();
    const modeles = new ModelesService(base.prisma, registre);
    const executions = creerExecutionsService({ prisma: base.prisma });
    lots = new LotsService(base.prisma, modeles);
    executeur = new ExecuteurLots(
      base.prisma,
      executions,
      new LancementService(base.prisma, registre, executions),
    );
    campagnes = new CampagnesService(base.prisma);
    parcelles = new ParcellesService(base.prisma);
    await modeles.synchroniserPredefinis();
    const [modele] = (await modeles.listerResumes()).filter(
      (resume) => resume.code === DIAGNOSTIC_PAR_LOT.code,
    );
    modeleId = modele?.id ?? '';
    clientId = (await new ClientsService(base.prisma).creer({ donnees: { nom: 'Coopérative' } }))
      .id;
  });

  afterAll(() => base.fermer());

  async function parcelle({
    nom,
    geometrie,
    avecCampagne,
  }: {
    nom: string;
    geometrie: GeometrieParcelle;
    avecCampagne: boolean;
  }): Promise<string> {
    const creee = await parcelles.creer({ donnees: { clientId, nom, geometrie } });
    if (avecCampagne) {
      await campagnes.creer({
        donnees: { parcelleId: creee.id, nom: 'Saison 2026', dateDebut: '2026-03-01' },
      });
    }
    return creee.id;
  }

  it('isole les échecs : une parcelle réussit, les autres échouent sans la bloquer', async () => {
    const couverte = await parcelle({
      nom: 'Couverte',
      geometrie: CONTOUR_COUVERT,
      avecCampagne: true,
    });
    const horsImage = await parcelle({
      nom: 'Hors image',
      geometrie: GEOMETRIE_TEST,
      avecCampagne: true,
    });
    const sansCampagne = await parcelle({
      nom: 'Sans campagne',
      geometrie: CONTOUR_COUVERT,
      avecCampagne: false,
    });

    const lot = await lots.creer({
      donnees: { modeleId, parcelleIds: [couverte, horsImage, sansCampagne], valeurs: VALEURS },
    });
    // La parcelle sans campagne échoue dès la création, sans passer par la file.
    expect(lot.taches.find((tache) => tache.parcelle.id === sansCampagne)).toMatchObject({
      statut: 'echouee',
      erreur: MESSAGE_SANS_CAMPAGNE,
      tentatives: 0,
    });

    await executeur.traiterTout();
    const fini = await lots.trouver({ id: lot.id });
    const tache = (id: string) => fini.taches.find((candidate) => candidate.parcelle.id === id);

    expect(fini.statut).toBe('termine_avec_echecs');
    expect(fini.progression).toEqual({
      total: 3,
      enAttente: 0,
      enCours: 0,
      reussies: 1,
      echouees: 2,
      pourcentage: 100,
    });
    expect(tache(couverte)).toMatchObject({ statut: 'reussie', tentatives: 1, erreur: null });
    // Hors de l'image : trois tentatives (relances automatiques), puis échec.
    expect(tache(horsImage)).toMatchObject({ statut: 'echouee', tentatives: 3 });
    expect(tache(horsImage)?.erreur).toContain('ndvi');
    const executionsHorsImage = await base.prisma.executionWorkflow.count({
      where: { campagne: { parcelleId: horsImage } },
    });
    expect(executionsHorsImage).toBe(3);

    // Variables résolues dans le snapshot de l'exécution réussie.
    const execution = await base.prisma.executionWorkflow.findUniqueOrThrow({
      where: { id: tache(couverte)?.executionId ?? '' },
      include: { decisions: true },
    });
    const snapshot = execution.snapshot as {
      valeursVariables: Record<string, string>;
      noeuds: { id: string; parametres: Record<string, unknown> }[];
    };
    expect(execution.statut).toBe('terminee');
    expect(execution.decisions.length).toBeGreaterThan(0);
    expect(snapshot.valeursVariables).toMatchObject({
      parcelleId: couverte,
      dateDebut: '2026-04-01',
      image: expect.stringMatching(/^\[fichier de \d+ Ko\]$/),
    });
    expect(snapshot.noeuds.find((noeud) => noeud.id === 'contour')?.parametres).toEqual({
      parcelleId: couverte,
    });
    expect(
      snapshot.noeuds.find((noeud) => noeud.id === 'rapport')?.parametres.introduction,
    ).toContain('du 2026-04-01 au 2026-04-30');
  });

  it('relance les échecs : la parcelle dotée d’une campagne entre-temps réussit', async () => {
    const tardive = await parcelle({
      nom: 'Campagne tardive',
      geometrie: CONTOUR_COUVERT,
      avecCampagne: false,
    });
    const lot = await lots.creer({
      donnees: { modeleId, parcelleIds: [tardive], valeurs: VALEURS },
    });
    expect(lot.statut).toBe('termine_avec_echecs');

    await campagnes.creer({
      donnees: { parcelleId: tardive, nom: 'Saison 2026', dateDebut: '2026-03-01' },
    });
    const relance = await lots.relancerEchecs({ id: lot.id });
    expect(relance.taches[0]).toMatchObject({ statut: 'en_attente', tentatives: 0, erreur: null });
    expect(relance.statut).toBe('en_cours');

    await executeur.traiterTout();

    expect((await lots.trouver({ id: lot.id })).taches[0]).toMatchObject({ statut: 'reussie' });
  });

  it('refuse de lancer un lot si une variable obligatoire manque', async () => {
    const avant = await base.prisma.lot.count();

    await expect(
      lots.creer({
        donnees: { modeleId, parcelleIds: ['p'], valeurs: { image: VALEURS.image } },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(await base.prisma.lot.count()).toBe(avant);
  });

  it('remet en file les tâches interrompues par un arrêt de l’API', async () => {
    const id = await parcelle({
      nom: 'Interrompue',
      geometrie: CONTOUR_COUVERT,
      avecCampagne: true,
    });
    const lot = await lots.creer({ donnees: { modeleId, parcelleIds: [id], valeurs: VALEURS } });
    await base.prisma.tacheLot.updateMany({
      where: { lotId: lot.id },
      data: { statut: 'en_cours', verrouilleeLe: new Date() },
    });

    expect(await executeur.recupererInterrompues()).toBe(1);
    expect((await lots.trouver({ id: lot.id })).taches[0]?.statut).toBe('en_attente');
    await executeur.traiterTout();
    expect((await lots.trouver({ id: lot.id })).taches[0]?.statut).toBe('reussie');
  });
});
