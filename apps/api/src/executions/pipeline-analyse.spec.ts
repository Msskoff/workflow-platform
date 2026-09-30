import { devisSchema, type WorkflowSnapshot } from '@workflow/shared';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { creerExecution, creerExecutionsService, creerJeuDeDonnees } from '../test/jeu-de-donnees';
import { lireExemple, lireExempleBase64 } from '../test/noeuds';
import { DecisionsService } from '../decisions/decisions.service';
import { LancementService } from './lancement.service';

/**
 * Import GPS ─┬─ Surface et périmètre ─┬─ Devis
 *             │                        └──────────────┐
 *             └─ NDVI (image d'exemple) ─ Zonage ─ Règles métier
 *                          └──────────────────────────┘
 */
const SNAPSHOT_ANALYSE: WorkflowSnapshot = {
  workflowId: 'wf-analyse',
  nom: 'Analyse de parcelle',
  version: 1,
  variables: [],
  valeursVariables: {},
  noeuds: [
    {
      id: 'gps',
      type: 'collecte.import_gps',
      parametres: { contenu: lireExemple({ nom: 'parcelle-contour.geojson' }) },
    },
    { id: 'surface', type: 'analyse.surface_perimetre', parametres: {} },
    {
      id: 'ndvi',
      type: 'analyse.ndvi',
      parametres: { image: lireExempleBase64({ nom: 'sentinel2-parcelle.tif' }) },
    },
    { id: 'zonage', type: 'analyse.zonage', parametres: { nombreZones: 3 } },
    { id: 'regles', type: 'decision.regles_metier', parametres: {} },
    { id: 'devis', type: 'restitution.devis', parametres: {} },
  ],
  connexions: [
    { id: 'c1', source: 'gps', sourcePort: 'geometrie', cible: 'surface', ciblePort: 'geometrie' },
    { id: 'c2', source: 'gps', sourcePort: 'geometrie', cible: 'ndvi', ciblePort: 'geometrie' },
    { id: 'c3', source: 'ndvi', sourcePort: 'raster', cible: 'zonage', ciblePort: 'raster' },
    {
      id: 'c4',
      source: 'surface',
      sourcePort: 'indicateurs',
      cible: 'regles',
      ciblePort: 'indicateurs',
    },
    {
      id: 'c5',
      source: 'ndvi',
      sourcePort: 'indicateurs',
      cible: 'regles',
      ciblePort: 'indicateurs',
    },
    {
      id: 'c6',
      source: 'zonage',
      sourcePort: 'indicateurs',
      cible: 'regles',
      ciblePort: 'indicateurs',
    },
    {
      id: 'c7',
      source: 'surface',
      sourcePort: 'surfaceHa',
      cible: 'devis',
      ciblePort: 'surfaceHa',
    },
  ],
};

describe('Pipeline d’analyse complet (NDVI, zonage, règles, devis)', () => {
  let base: BaseDeTest;
  let lancement: LancementService;

  beforeAll(() => {
    base = creerBaseDeTest();
    lancement = new LancementService(
      base.prisma,
      creerRegistreNoeuds(),
      creerExecutionsService({ prisma: base.prisma }),
    );
  });

  afterAll(() => base.fermer());

  it('exécute la chaîne et enregistre les décisions en brouillon, expliquées et tracées', async () => {
    const { campagne } = await creerJeuDeDonnees({ prisma: base.prisma });
    const { id } = await creerExecution({
      prisma: base.prisma,
      campagneId: campagne.id,
      snapshot: SNAPSHOT_ANALYSE,
    });

    const execution = await lancement.executer({ id });

    expect(execution.statut).toBe('terminee');
    expect(execution.noeuds.every((etat) => etat.statut === 'ok')).toBe(true);
    const devis = devisSchema.parse(
      execution.noeuds.find((etat) => etat.noeudId === 'devis')?.sorties?.devis,
    );
    expect(devis.totalTtc).toBeGreaterThan(400);

    // Règles d'exemple : NDVI moyen ≈ 0,58 (≥ 0,5, pas de décision) ; hétérogénéité ≈ 30 % (> 15 %).
    const decisions = await new DecisionsService(base.prisma).lister({
      filtre: { executionId: id },
    });
    expect(decisions).toEqual([
      expect.objectContaining({
        statut: 'brouillon',
        noeudIds: ['gps', 'ndvi', 'zonage', 'regles'],
        priorite: 'normale',
        recommandation: 'Moduler la fertilisation azotée selon les zones de vigueur.',
        explication: expect.stringMatching(/^L’hétérogénéité du NDVI \(\d+,\d %\) dépasse 15 %/),
        donnees: expect.objectContaining({
          regleId: 'parcelle-heterogene',
          indicateur: 'heterogeneiteNdviPourcent',
          operateur: '>',
          seuil: 15,
          source: { noeudId: 'zonage', port: 'indicateurs' },
        }),
      }),
    ]);
  });
});
