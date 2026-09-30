import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import {
  appliquerParametresCulture,
  creerExportWorkflow,
  lireExportWorkflow,
  type ExportWorkflow,
  type ImportWorkflow,
  type ResultatImport,
  type CreerModele,
  type GrapheWorkflow,
  type ModeleWorkflow,
  type ModifierModele,
  type ParametresCulture,
  type ResumeModele,
} from '@workflow/shared';
import { Prisma } from '../generated/prisma/client';
import { executerSansDoublon, introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { validerWorkflowComplet } from '../moteur/valider-workflow';
import { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { PrismaService } from '../prisma/prisma.service';
import { MODELES_PREDEFINIS } from './modeles-predefinis';
import { INCLURE_CULTURE, versModele, versResume } from './modeles.mapper';

export interface FiltreModeles {
  /** Seulement les modèles de cette culture. */
  cultureId?: string;
}

/**
 * Modèles de workflow. Un modèle doit être exécutable à la structure près (types de nœuds
 * connus, ports compatibles, sans cycle, entrées obligatoires connectées, paramètres
 * valides) ; il ne contient pas forcément les données (fichier GPS, image).
 */
@Injectable()
export class ModelesService
  implements ServiceCrud<ModeleWorkflow, CreerModele, ModifierModele, FiltreModeles>, OnModuleInit
{
  private readonly journal = new Logger(ModelesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registre: RegistreNoeuds,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.synchroniserPredefinis();
  }

  /**
   * Crée ou met à jour les modèles prédéfinis à partir du code (identifiés par `code`).
   * Idempotent : appelé à chaque démarrage de l'API et après le seed des cultures.
   * Un modèle de culture n'est rattaché que si la culture existe en base (seed).
   */
  async synchroniserPredefinis(): Promise<void> {
    for (const predefini of MODELES_PREDEFINIS) {
      this.verifierGraphe({ graphe: predefini.graphe });
      const culture = predefini.cultureCode
        ? await this.prisma.culture.findUnique({ where: { code: predefini.cultureCode } })
        : null;
      if (predefini.cultureCode && !culture) {
        this.journal.log(
          `Culture « ${predefini.cultureCode} » absente : lancez le seed pour rattacher « ${predefini.nom} »`,
        );
      }
      const donnees = {
        nom: predefini.nom,
        description: predefini.description,
        graphe: predefini.graphe,
        predefini: true,
        cultureId: culture?.id ?? null,
        parametresDefaut: predefini.parametresDefaut ?? Prisma.DbNull,
      };
      try {
        await this.prisma.modeleWorkflow.upsert({
          where: { code: predefini.code },
          create: { code: predefini.code, ...donnees },
          update: donnees,
        });
      } catch (erreur) {
        this.journal.warn(
          `Modèle prédéfini « ${predefini.nom} » non synchronisé : ${String(erreur)}`,
        );
      }
    }
  }

  async lister({ filtre = {} }: { filtre?: FiltreModeles } = {}): Promise<ModeleWorkflow[]> {
    const lignes = await this.prisma.modeleWorkflow.findMany({
      where: { cultureId: filtre.cultureId },
      include: INCLURE_CULTURE,
    });
    // Prédéfinis d'abord, puis ordre alphabétique français (SQLite classerait « maïs » après « manioc »).
    return lignes
      .map((ligne) => versModele({ ligne }))
      .sort(
        (a, b) => Number(b.predefini) - Number(a.predefini) || a.nom.localeCompare(b.nom, 'fr'),
      );
  }

  /** Liste légère pour l'éditeur (sans les graphes). */
  async listerResumes({ filtre = {} }: { filtre?: FiltreModeles } = {}): Promise<ResumeModele[]> {
    return (await this.lister({ filtre })).map((modele) => versResume({ modele }));
  }

  async trouver({ id }: { id: string }): Promise<ModeleWorkflow> {
    const ligne = await this.prisma.modeleWorkflow.findUnique({
      where: { id },
      include: INCLURE_CULTURE,
    });
    if (!ligne) {
      throw introuvable({ entite: 'Modèle', id });
    }
    return versModele({ ligne });
  }

  /** Les paramètres par défaut éventuels sont appliqués au graphe avant sa validation. */
  async creer({ donnees }: { donnees: CreerModele }): Promise<ModeleWorkflow> {
    await this.verifierCulture({ cultureId: donnees.cultureId });
    const parametresDefaut = donnees.parametresDefaut ?? null;
    const graphe = ModelesService.grapheParametre({ graphe: donnees.graphe, parametresDefaut });
    this.verifierGraphe({ graphe });
    const ligne = await executerSansDoublon({
      operation: () =>
        this.prisma.modeleWorkflow.create({
          data: {
            nom: donnees.nom,
            description: donnees.description,
            graphe,
            cultureId: donnees.cultureId ?? null,
            parametresDefaut: parametresDefaut ?? Prisma.DbNull,
          },
          include: INCLURE_CULTURE,
        }),
      messageDoublon: `Un modèle s’appelle déjà « ${donnees.nom} »`,
    });
    return versModele({ ligne });
  }

  async modifier({
    id,
    donnees,
  }: {
    id: string;
    donnees: ModifierModele;
  }): Promise<ModeleWorkflow> {
    const actuel = await this.verifierModifiable({ id });
    await this.verifierCulture({ cultureId: donnees.cultureId });
    // Graphe ou paramètres modifiés : les paramètres (nouveaux ou existants) sont réappliqués.
    const parametresDefaut =
      donnees.parametresDefaut === undefined ? actuel.parametresDefaut : donnees.parametresDefaut;
    const graphe =
      donnees.graphe !== undefined || donnees.parametresDefaut !== undefined
        ? ModelesService.grapheParametre({
            graphe: donnees.graphe ?? actuel.graphe,
            parametresDefaut,
          })
        : undefined;
    if (graphe) {
      this.verifierGraphe({ graphe });
    }
    const ligne = await executerSansDoublon({
      operation: () =>
        this.prisma.modeleWorkflow.update({
          where: { id },
          data: {
            nom: donnees.nom,
            description: donnees.description,
            graphe,
            cultureId: donnees.cultureId,
            ...(donnees.parametresDefaut !== undefined && {
              parametresDefaut: donnees.parametresDefaut ?? Prisma.DbNull,
            }),
          },
          include: INCLURE_CULTURE,
        }),
      messageDoublon: `Un modèle s’appelle déjà « ${donnees.nom ?? ''} »`,
    });
    return versModele({ ligne });
  }

  /** Export JSON versionné ; la culture est désignée par son code (stable d'une plateforme à l'autre). */
  async exporter({ id }: { id: string }): Promise<ExportWorkflow> {
    const modele = await this.trouver({ id });
    const culture = modele.culture
      ? await this.prisma.culture.findUnique({ where: { id: modele.culture.id } })
      : null;
    return creerExportWorkflow({ modele, cultureCode: culture?.code ?? null });
  }

  /**
   * Import d'un export JSON : format et version vérifiés, schéma validé, puis chaque type de
   * nœud recherché dans le catalogue (erreur explicite par nœud inconnu), enfin validation
   * complète du graphe à la création du modèle.
   */
  async importer({ donnees }: { donnees: ImportWorkflow }): Promise<ResultatImport> {
    const lecture = lireExportWorkflow({ contenu: donnees.contenu });
    if (!lecture.ok) {
      throw new BadRequestException({
        message: 'Fichier d’export invalide',
        erreurs: lecture.erreurs.map((message) => ({ code: 'export_invalide', message })),
      });
    }
    const { workflow } = lecture.export;
    const inconnus = workflow.graphe.noeuds.filter(
      (noeud) => !this.registre.obtenir({ type: noeud.type }),
    );
    if (inconnus.length > 0) {
      throw new BadRequestException({
        message: 'Nœuds inconnus de cette plateforme',
        erreurs: inconnus.map((noeud) => ({
          code: 'type_inconnu',
          noeudId: noeud.id,
          message: `Nœud « ${noeud.id} » : le type « ${noeud.type} » n'existe pas sur cette plateforme (nœud retiré ou plateforme plus ancienne)`,
        })),
      });
    }

    const avertissements: string[] = [];
    const culture = workflow.culture
      ? await this.prisma.culture.findUnique({ where: { code: workflow.culture.code } })
      : null;
    if (workflow.culture && !culture) {
      avertissements.push(
        `Culture « ${workflow.culture.nom} » (${workflow.culture.code}) absente : modèle importé sans culture`,
      );
    }
    const modele = await this.creer({
      donnees: {
        nom: donnees.nom ?? workflow.nom,
        description: workflow.description,
        graphe: workflow.graphe,
        cultureId: culture?.id ?? null,
        parametresDefaut: workflow.parametresDefaut,
      },
    });
    return { modele, avertissements };
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.verifierModifiable({ id });
    await this.prisma.modeleWorkflow.delete({ where: { id } });
  }

  private async verifierModifiable({ id }: { id: string }): Promise<ModeleWorkflow> {
    const modele = await this.trouver({ id });
    if (modele.predefini) {
      throw new ConflictException(
        `« ${modele.nom} » est un modèle prédéfini : chargez-le puis enregistrez-le sous un autre nom`,
      );
    }
    return modele;
  }

  private async verifierCulture({ cultureId }: { cultureId?: string | null }): Promise<void> {
    if (cultureId && !(await this.prisma.culture.findUnique({ where: { id: cultureId } }))) {
      throw introuvable({ entite: 'Culture', id: cultureId });
    }
  }

  private static grapheParametre({
    graphe,
    parametresDefaut,
  }: {
    graphe: GrapheWorkflow;
    parametresDefaut: ParametresCulture | null;
  }): GrapheWorkflow {
    return parametresDefaut
      ? appliquerParametresCulture({ graphe, parametres: parametresDefaut })
      : graphe;
  }

  private verifierGraphe({ graphe }: { graphe: GrapheWorkflow }): void {
    const erreurs = validerWorkflowComplet({ graphe, registre: this.registre });
    if (erreurs.length > 0) {
      throw new BadRequestException({ message: 'Modèle invalide', erreurs });
    }
  }
}
