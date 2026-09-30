import { BadRequestException, ConflictException } from '@nestjs/common';
import type { GrapheWorkflow } from '@workflow/shared';
import { DecisionsService } from '../decisions/decisions.service';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { executerDiagnostic } from '../test/diagnostic';
import { creerJeuDeDonnees } from '../test/jeu-de-donnees';
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
        nombreNoeuds: 9,
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
      'restitution.rapport_pdf',
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

    const execution = await executerDiagnostic({ prisma: base.prisma, campagneId: campagne.id });

    expect(execution.statut).toBe('terminee');
    expect(execution.noeuds.map((etat) => etat.statut)).toEqual(new Array(9).fill('ok'));
    const decisions = await new DecisionsService(base.prisma).lister({
      filtre: { executionId: execution.id },
    });
    expect(decisions).toHaveLength(4);
    expect(decisions.every((decision) => decision.statut === 'brouillon')).toBe(true);
    expect(decisions).toContainEqual(
      expect.objectContaining({
        noeudIds: ['import_gps', 'reprojection', 'ndvi', 'zonage', 'regles'],
        priorite: 'haute',
      }),
    );
  });
});
