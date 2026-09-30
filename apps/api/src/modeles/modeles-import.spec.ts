import { BadRequestException } from '@nestjs/common';
import { FORMAT_EXPORT_WORKFLOW, type ExportWorkflow } from '@workflow/shared';
import { creerRegistreNoeuds } from '../noeuds/registre-noeuds';
import { seederCultures } from '../seed/seed-cultures';
import { creerBaseDeTest, type BaseDeTest } from '../test/base-de-test';
import { DIAGNOSTIC_PAR_LOT } from './modeles-predefinis';
import { ModelesService } from './modeles.service';

describe('Export et import de workflow', () => {
  let base: BaseDeTest;
  let modeles: ModelesService;

  beforeAll(async () => {
    base = creerBaseDeTest();
    modeles = new ModelesService(base.prisma, creerRegistreNoeuds());
    await seederCultures({ prisma: base.prisma });
  });

  afterAll(() => base.fermer());

  async function exporter({ code }: { code: string }): Promise<ExportWorkflow> {
    const resume = (await modeles.listerResumes()).find((candidat) => candidat.code === code);
    return modeles.exporter({ id: resume?.id ?? '' });
  }

  /** Message(s) de l'erreur 400 levée par l'import. */
  async function erreursImport({ contenu }: { contenu: unknown }): Promise<string[]> {
    try {
      await modeles.importer({ donnees: { contenu } });
    } catch (erreur) {
      if (erreur instanceof BadRequestException) {
        const reponse = erreur.getResponse() as { erreurs: { message: string }[] };
        return reponse.erreurs.map((detail) => detail.message);
      }
      throw erreur;
    }
    throw new Error('L’import aurait dû être refusé');
  }

  it('exporte un modèle avec ses variables et le réimporte à l’identique', async () => {
    const contenu = await exporter({ code: DIAGNOSTIC_PAR_LOT.code });

    expect(contenu).toMatchObject({ format: FORMAT_EXPORT_WORKFLOW, version: 1 });
    expect(contenu.workflow.graphe.variables.map((variable) => variable.nom)).toEqual([
      'parcelleId',
      'image',
      'dateDebut',
      'dateFin',
    ]);
    // Aller-retour JSON, comme un vrai fichier.
    const { modele, avertissements } = await modeles.importer({
      donnees: { contenu: JSON.parse(JSON.stringify(contenu)), nom: 'Diagnostic lot (copie)' },
    });

    expect(avertissements).toEqual([]);
    expect(modele).toMatchObject({ nom: 'Diagnostic lot (copie)', predefini: false });
    expect(modele.graphe).toEqual(contenu.workflow.graphe);
  });

  it('retrouve la culture par son code, ou prévient si elle est absente', async () => {
    const contenu = await exporter({ code: 'diagnostic-cacao' });
    expect(contenu.workflow.culture).toEqual({ code: 'cacao', nom: 'Cacao' });

    const importe = await modeles.importer({ donnees: { contenu, nom: 'Cacao importé' } });
    expect(importe.modele.culture?.nom).toBe('Cacao');

    const inconnue = await modeles.importer({
      donnees: {
        contenu: {
          ...contenu,
          workflow: { ...contenu.workflow, culture: { code: 'sorgho', nom: 'Sorgho' } },
        },
        nom: 'Sorgho importé',
      },
    });
    expect(inconnue.modele.culture).toBeNull();
    expect(inconnue.avertissements).toEqual([
      'Culture « Sorgho » (sorgho) absente : modèle importé sans culture',
    ]);
  });

  it('refuse un nœud inconnu en le nommant', async () => {
    const contenu = await exporter({ code: 'diagnostic-initial-parcelle' });
    const [premier, ...autres] = contenu.workflow.graphe.noeuds;
    const invalide = {
      ...contenu,
      workflow: {
        ...contenu.workflow,
        nom: 'Avec nœud inconnu',
        graphe: {
          ...contenu.workflow.graphe,
          noeuds: [{ ...premier, type: 'analyse.lidar' }, ...autres],
        },
      },
    };

    expect(await erreursImport({ contenu: invalide })).toEqual([
      `Nœud « ${premier?.id} » : le type « analyse.lidar » n'existe pas sur cette plateforme (nœud retiré ou plateforme plus ancienne)`,
    ]);
  });

  it('refuse un fichier d’une autre version ou mal formé, avec un message explicite', async () => {
    const contenu = await exporter({ code: 'diagnostic-initial-parcelle' });

    expect(await erreursImport({ contenu: { ...contenu, version: 3 } })).toEqual([
      "Version d'export 3 non prise en charge (versions acceptées : 1).",
    ]);
    expect(
      await erreursImport({
        contenu: { ...contenu, workflow: { ...contenu.workflow, graphe: { noeuds: [] } } },
      }),
    ).toEqual([
      'workflow.graphe.noeuds : Too small: expected array to have >=1 items',
      'workflow.graphe.connexions : Invalid input: expected array, received undefined',
    ]);
  });

  it('refuse une variable référencée mais non déclarée', async () => {
    const contenu = await exporter({ code: DIAGNOSTIC_PAR_LOT.code });
    const sansVariables = {
      ...contenu,
      workflow: {
        ...contenu.workflow,
        nom: 'Variables oubliées',
        graphe: { ...contenu.workflow.graphe, variables: [] },
      },
    };

    await expect(modeles.importer({ donnees: { contenu: sansVariables } })).rejects.toThrow(
      BadRequestException,
    );
  });
});
