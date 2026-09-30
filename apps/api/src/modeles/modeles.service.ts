import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import type {
  CreerModele,
  GrapheWorkflow,
  ModeleWorkflow,
  ModifierModele,
  ResumeModele,
} from '@workflow/shared';
import { executerSansDoublon, introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { validerWorkflowComplet } from '../moteur/valider-workflow';
import { RegistreNoeuds } from '../noeuds/registre-noeuds';
import { PrismaService } from '../prisma/prisma.service';
import { MODELES_PREDEFINIS } from './modeles-predefinis';
import { versModele, versResume } from './modeles.mapper';

type FiltreModeles = Record<string, never>;

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
   * Idempotent : appelé à chaque démarrage de l'API.
   */
  async synchroniserPredefinis(): Promise<void> {
    for (const predefini of MODELES_PREDEFINIS) {
      this.verifierGraphe({ graphe: predefini.graphe });
      const donnees = {
        nom: predefini.nom,
        description: predefini.description,
        graphe: predefini.graphe,
        predefini: true,
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

  async lister(): Promise<ModeleWorkflow[]> {
    const lignes = await this.prisma.modeleWorkflow.findMany({
      orderBy: [{ predefini: 'desc' }, { nom: 'asc' }],
    });
    return lignes.map((ligne) => versModele({ ligne }));
  }

  /** Liste légère pour l'éditeur (sans les graphes). */
  async listerResumes(): Promise<ResumeModele[]> {
    return (await this.lister()).map((modele) => versResume({ modele }));
  }

  async trouver({ id }: { id: string }): Promise<ModeleWorkflow> {
    const ligne = await this.prisma.modeleWorkflow.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Modèle', id });
    }
    return versModele({ ligne });
  }

  async creer({ donnees }: { donnees: CreerModele }): Promise<ModeleWorkflow> {
    this.verifierGraphe({ graphe: donnees.graphe });
    const ligne = await executerSansDoublon({
      operation: () =>
        this.prisma.modeleWorkflow.create({
          data: { nom: donnees.nom, description: donnees.description, graphe: donnees.graphe },
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
    await this.verifierModifiable({ id });
    if (donnees.graphe) {
      this.verifierGraphe({ graphe: donnees.graphe });
    }
    const ligne = await executerSansDoublon({
      operation: () => this.prisma.modeleWorkflow.update({ where: { id }, data: donnees }),
      messageDoublon: `Un modèle s’appelle déjà « ${donnees.nom ?? ''} »`,
    });
    return versModele({ ligne });
  }

  async supprimer({ id }: { id: string }): Promise<void> {
    await this.verifierModifiable({ id });
    await this.prisma.modeleWorkflow.delete({ where: { id } });
  }

  private async verifierModifiable({ id }: { id: string }): Promise<void> {
    const modele = await this.trouver({ id });
    if (modele.predefini) {
      throw new ConflictException(
        `« ${modele.nom} » est un modèle prédéfini : chargez-le puis enregistrez-le sous un autre nom`,
      );
    }
  }

  private verifierGraphe({ graphe }: { graphe: GrapheWorkflow }): void {
    const erreurs = validerWorkflowComplet({ graphe, registre: this.registre });
    if (erreurs.length > 0) {
      throw new BadRequestException({ message: 'Modèle invalide', erreurs });
    }
  }
}
