import { BadRequestException, ConflictException } from '@nestjs/common';
import type { GrapheWorkflow, WorkflowSnapshot } from '@workflow/shared';
import { DecisionsService } from '../decisions/decisions.service';
import { LancementService } from '../executions/lancement.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecution, creerExecutionsService, creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { lireExemple, lireExempleBase64 } from '../test/noeuds';
import { DIAGNOSTIC_INITIAL_PARCELLE } from './modeles-predefinis';
import { ModelesService } from './modeles.service';

const GRAPHE_SIMPLE: GrapheWorkflow = {
  noeuds: [
    { id: 'gps', type: 'collecte.import_gps', parametres: {} },
    { id: 'surface', type: 'analyse.surface_perimetre', parametres: {} },
  ],
  connexions: [
    { id: 'c1', source: 'gps', sourcePort: 'geometrie', cible: 'surface', ciblePort: 'geometrie' },
  ],
};

describe('ModelesService', () => {
  let base: BaseDeTest;
  let service: ModelesService;

  beforeAll(() => {
    base = creerBaseDeTest();
    service = new ModelesService(base.prisma, creerRegistreNoeuds());
  });

  afterAll(() => base.fermer());

  it('installe le modèle « Diagnostic initial parcelle », sans doublon au redémarrage', async () => {
    await service.synchroniserPredefinis();
    await service.synchroniserPredefinis();

    const resumes = await service.listerResumes();
    expect(resumes.filter((resume) => resume.predefini)).toEqual([
      expect.objectContaining({
        code: 'diagnostic-initial-parcelle',
        nom: 'Diagnostic initial parcelle',
        nombreNoeuds: 8,
      }),
    ]);
    const types = (await service.trouver({ id: resumes[0]?.id ?? '' })).graphe.noeuds.map(
      (noeud) => noeud.type,
    );
    expect(types).toEqual([
      'collecte.import_gps',
      'standardisation.reprojection',
      'standardisation.controle_qualite',
      'analyse.surface_perimetre',
      'analyse.ndvi',
      'analyse.zonage',
      'decision.regles_metier',
      'restitution.devis',
    ]);
  });

  it('protège les modèles prédéfinis', async () => {
    await service.synchroniserPredefinis();
    const [predefini] = await service.listerResumes();

    await expect(service.supprimer({ id: predefini?.id ?? '' })).rejects.toThrow(ConflictException);
    await expect(
      service.modifier({ id: predefini?.id ?? '', donnees: { nom: 'Autre nom' } }),
    ).rejects.toThrow(ConflictException);
  });

  it('enregistre un modèle, refuse un nom déjà pris et un graphe incohérent', async () => {
    const modele = await service.creer({
      donnees: { nom: 'Surface seule', description: '', graphe: GRAPHE_SIMPLE },
    });

    expect(modele).toMatchObject({ nom: 'Surface seule', predefini: false, code: null });
    await expect(
      service.creer({ donnees: { nom: 'Surface seule', description: '', graphe: GRAPHE_SIMPLE } }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.creer({
        donnees: {
          nom: 'Incohérent',
          description: '',
          graphe: { ...GRAPHE_SIMPLE, connexions: [] },
        },
      }),
    ).rejects.toThrow(BadRequestException);

    await service.supprimer({ id: modele.id });
    await expect(service.trouver({ id: modele.id })).rejects.toThrow(/introuvable/);
  });

  it('exécute le diagnostic complet une fois le GPS et l’image fournis', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const donneesExemple: Record<string, Record<string, string>> = {
      import_gps: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
      ndvi: { image: lireExempleBase64({ nom: 'sentinel2-parcelle.tif' }) },
    };
    const snapshot: WorkflowSnapshot = {
      workflowId: DIAGNOSTIC_INITIAL_PARCELLE.code,
      nom: DIAGNOSTIC_INITIAL_PARCELLE.nom,
      version: 1,
      connexions: DIAGNOSTIC_INITIAL_PARCELLE.graphe.connexions,
      noeuds: DIAGNOSTIC_INITIAL_PARCELLE.graphe.noeuds.map((noeud) => ({
        ...noeud,
        parametres: { ...noeud.parametres, ...donneesExemple[noeud.id] },
      })),
    };
    const { id } = await creerExecution({ prisma: base.prisma, campagneId: campagne.id, snapshot });
    const lancement = new LancementService(
      base.prisma,
      creerRegistreNoeuds(),
      creerExecutionsService({ prisma: base.prisma }),
    );

    const execution = await lancement.executer({ id });

    expect(execution.statut).toBe('terminee');
    expect(execution.noeuds.map((etat) => etat.statut)).toEqual(new Array(8).fill('ok'));
    const decisions = await new DecisionsService(base.prisma).lister({
      filtre: { executionId: id },
    });
    expect(decisions).toEqual([
      expect.objectContaining({
        statut: 'brouillon',
        noeudIds: ['import_gps', 'reprojection', 'ndvi', 'zonage', 'regles'],
      }),
    ]);
  });
});
