import { BadRequestException, Injectable } from '@nestjs/common';
import {
  calculerCalendrier,
  problemesCulture,
  type CreerCulture,
  type Culture,
  type ModifierCulture,
  type PlanCampagne,
  type PropositionCampagne,
} from '@workflow/shared';
import { versCampagne } from '../campagnes/campagnes.mapper';
import { executerSansDoublon, introuvable } from '../common/erreurs';
import { ModelesService } from '../modeles/modeles.service';
import { PrismaService } from '../prisma/prisma.service';
import { versCulture } from './cultures.mapper';

/**
 * Référentiel des cultures et propositions de campagne : pour une culture et une date de début,
 * les modèles de workflow correspondants et le calendrier prévisionnel des interventions.
 */
@Injectable()
export class CulturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modeles: ModelesService,
  ) {}

  async lister(): Promise<Culture[]> {
    const lignes = await this.prisma.culture.findMany();
    // Tri alphabétique français (SQLite trierait « Maïs » après « Manioc »).
    return lignes
      .map((ligne) => versCulture({ ligne }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  async trouver({ id }: { id: string }): Promise<Culture> {
    const ligne = await this.prisma.culture.findUnique({ where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Culture', id });
    }
    return versCulture({ ligne });
  }

  async creer({ donnees }: { donnees: CreerCulture }): Promise<Culture> {
    const ligne = await executerSansDoublon({
      operation: () => this.prisma.culture.create({ data: donnees }),
      messageDoublon: `Une culture porte déjà le code « ${donnees.code} » ou le nom « ${donnees.nom} »`,
    });
    return versCulture({ ligne });
  }

  /** Le cycle et les stades sont revérifiés après fusion avec l'existant. */
  async modifier({ id, donnees }: { id: string; donnees: ModifierCulture }): Promise<Culture> {
    const actuelle = await this.trouver({ id });
    const problemes = problemesCulture({
      cycleJours: donnees.cycleJours ?? actuelle.cycleJours,
      stades: donnees.stades ?? actuelle.stades,
    });
    if (problemes.length > 0) {
      throw new BadRequestException({ message: 'Culture incohérente', erreurs: problemes });
    }
    const ligne = await executerSansDoublon({
      operation: () => this.prisma.culture.update({ where: { id }, data: donnees }),
      messageDoublon: `Une culture s’appelle déjà « ${donnees.nom ?? ''} »`,
    });
    return versCulture({ ligne });
  }

  /**
   * Modèles de la culture (prédéfinis d'abord) et calendrier prévisionnel à partir de
   * `dateDebut`. Les doses du calendrier viennent du premier modèle qui en expose.
   */
  async proposition({
    id,
    dateDebut,
  }: {
    id: string;
    dateDebut: string;
  }): Promise<PropositionCampagne> {
    const culture = await this.trouver({ id });
    const modeles = await this.modeles.listerResumes({ filtre: { cultureId: id } });
    const reference = modeles.find((modele) => modele.parametresDefaut !== null) ?? null;
    return {
      culture,
      modeles,
      modeleReferenceId: reference?.id ?? null,
      calendrier: calculerCalendrier({
        culture,
        dateDebut,
        dosesReference: reference?.parametresDefaut?.dosesReference ?? [],
      }),
    };
  }

  /** Plan d'une campagne : sa proposition si elle est rattachée à une culture du référentiel. */
  async planCampagne({ campagneId }: { campagneId: string }): Promise<PlanCampagne> {
    const ligne = await this.prisma.campagne.findUnique({ where: { id: campagneId } });
    if (!ligne) {
      throw introuvable({ entite: 'Campagne', id: campagneId });
    }
    const campagne = versCampagne({ ligne });
    return {
      campagne,
      proposition: campagne.cultureId
        ? await this.proposition({ id: campagne.cultureId, dateDebut: campagne.dateDebut })
        : null,
    };
  }
}
