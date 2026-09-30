import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampagnesService } from '../campagnes/campagnes.service';
import { DIAGNOSTIC_INITIAL_PARCELLE } from '../modeles/modeles-predefinis';
import { ModelesService } from '../modeles/modeles.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { seederCultures } from '../seed/seed-cultures';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { PARAMETRES_CULTURES_EXEMPLE } from './cultures-exemple';
import { CulturesService } from './cultures.service';

describe('CulturesService', () => {
  let base: BaseDeTest;
  let cultures: CulturesService;
  let modeles: ModelesService;
  let campagnes: CampagnesService;

  beforeAll(async () => {
    base = creerBaseDeTest();
    modeles = new ModelesService(base.prisma, creerRegistreNoeuds());
    cultures = new CulturesService(base.prisma, modeles);
    campagnes = new CampagnesService(base.prisma);
    await seederCultures({ prisma: base.prisma });
  });

  afterAll(() => base.fermer());

  async function cultureParCode({ code }: { code: string }) {
    const culture = (await cultures.lister()).find((candidate) => candidate.code === code);
    if (!culture) {
      throw new Error(`Culture ${code} absente du seed`);
    }
    return culture;
  }

  it('crée les trois cultures d’exemple, marquées à valider, sans jamais les écraser', async () => {
    const mais = await cultureParCode({ code: 'mais' });
    await cultures.modifier({
      id: mais.id,
      donnees: { aValider: false, noteValidation: 'Validé.' },
    });

    const bilan = await seederCultures({ prisma: base.prisma });

    expect(bilan).toEqual({ creees: [], conservees: ['Maïs', 'Manioc', 'Cacao'] });
    const liste = await cultures.lister();
    expect(liste.map((culture) => culture.nom)).toEqual(['Cacao', 'Maïs', 'Manioc']);
    expect(liste.find((culture) => culture.code === 'manioc')?.aValider).toBe(true);
    // La validation saisie par l'agronome est conservée.
    expect((await cultures.trouver({ id: mais.id })).aValider).toBe(false);
  });

  it('propose les modèles de la culture et un calendrier avec les doses de référence', async () => {
    const mais = await cultureParCode({ code: 'mais' });

    const proposition = await cultures.proposition({ id: mais.id, dateDebut: '2026-05-01' });

    expect(proposition.modeles.map((modele) => modele.nom)).toEqual(['Diagnostic maïs']);
    expect(proposition.modeleReferenceId).toBe(proposition.modeles[0]?.id);
    expect(proposition.calendrier).toMatchObject({
      dateDebut: '2026-05-01',
      dateFinPrevue: '2026-08-18',
    });
    expect(proposition.calendrier.interventions.find((i) => i.code === 'mais-uree-1')).toEqual({
      date: '2026-05-21',
      stade: { code: 'vegetatif', nom: 'Croissance végétative (4 à 8 feuilles)' },
      code: 'mais-uree-1',
      libelle: 'Premier apport d’urée (4 à 6 feuilles)',
      type: 'fertilisation',
      dose: { intrant: 'Urée 46 %', dose: 50, unite: 'kg/ha' },
    });
  });

  it('rattache le modèle de culture avec ses paramètres appliqués au graphe', async () => {
    const cacao = await cultureParCode({ code: 'cacao' });
    const [resume] = await modeles.listerResumes({ filtre: { cultureId: cacao.id } });
    const modele = await modeles.trouver({ id: resume?.id ?? '' });

    expect(modele.culture).toEqual({ id: cacao.id, nom: 'Cacao' });
    expect(modele.parametresDefaut).toEqual(PARAMETRES_CULTURES_EXEMPLE.cacao);
    const regles = modele.graphe.noeuds.find((noeud) => noeud.id === 'regles')?.parametres
      .regles as { indicateur: string; seuil: number }[];
    expect(regles.find((regle) => regle.indicateur === 'ndviMoyen')?.seuil).toBe(0.7);
    expect(modele.graphe.noeuds.find((noeud) => noeud.id === 'devis')?.parametres).toMatchObject({
      fraisFixesHt: 25,
    });
  });

  it('applique les paramètres par défaut d’un modèle créé pour une culture', async () => {
    const manioc = await cultureParCode({ code: 'manioc' });

    const modele = await modeles.creer({
      donnees: {
        nom: 'Suivi manioc coopérative',
        description: '',
        graphe: DIAGNOSTIC_INITIAL_PARCELLE.graphe,
        cultureId: manioc.id,
        parametresDefaut: {
          ...PARAMETRES_CULTURES_EXEMPLE.manioc!,
          seuilsNdvi: {
            vigueurASurveiller: 0.5,
            heterogeneitePourcent: 30,
            partZoneFaiblePourcent: 35,
          },
        },
      },
    });

    const regles = modele.graphe.noeuds.find((noeud) => noeud.id === 'regles')?.parametres
      .regles as { indicateur: string; seuil: number }[];
    expect(regles.find((regle) => regle.indicateur === 'partZoneFaiblePourcent')?.seuil).toBe(35);
    await expect(
      modeles.creer({
        donnees: {
          nom: 'Culture inconnue',
          description: '',
          graphe: DIAGNOSTIC_INITIAL_PARCELLE.graphe,
          cultureId: 'inconnue',
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('donne le plan d’une campagne créée avec une culture du référentiel', async () => {
    const manioc = await cultureParCode({ code: 'manioc' });
    const { parcelle } = await creerJeuDeDonnees({ prisma: base.prisma });

    const campagne = await campagnes.creer({
      donnees: {
        parcelleId: parcelle.id,
        nom: 'Manioc 2026',
        cultureId: manioc.id,
        culture: 'nom saisi ignoré',
        dateDebut: '2026-04-15',
      },
    });
    const plan = await cultures.planCampagne({ campagneId: campagne.id });

    expect(campagne).toMatchObject({ cultureId: manioc.id, culture: 'Manioc' });
    expect(plan.proposition?.modeles.map((modele) => modele.nom)).toContain('Diagnostic manioc');
    expect(plan.proposition?.calendrier.dateFinPrevue).toBe('2027-04-09');
    await expect(
      campagnes.creer({
        donnees: {
          parcelleId: parcelle.id,
          nom: 'X',
          cultureId: 'inconnue',
          dateDebut: '2026-01-01',
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('n’a pas de plan pour une culture saisie librement', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });

    const plan = await cultures.planCampagne({ campagneId: campagne.id });

    expect(plan.campagne.cultureId).toBeNull();
    expect(plan.proposition).toBeNull();
  });

  it('revérifie la cohérence cycle/stades après modification', async () => {
    const cacao = await cultureParCode({ code: 'cacao' });

    await expect(cultures.modifier({ id: cacao.id, donnees: { cycleJours: 300 } })).rejects.toThrow(
      BadRequestException,
    );
  });
});
