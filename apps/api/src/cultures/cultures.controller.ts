import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  creerCultureSchema,
  filtrePropositionSchema,
  modifierCultureSchema,
  type CreerCulture,
  type Culture,
  type FiltreProposition,
  type ModifierCulture,
  type PropositionCampagne,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CulturesService } from './cultures.service';

/** Pas de suppression : une culture peut être référencée par des campagnes et des modèles. */
@Controller(apiRoutes.cultures)
export class CulturesController {
  constructor(private readonly culturesService: CulturesService) {}

  @Get()
  lister(): Promise<Culture[]> {
    return this.culturesService.lister();
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Culture> {
    return this.culturesService.trouver({ id });
  }

  /** Modèles proposés et calendrier prévisionnel pour une campagne commençant à `dateDebut`. */
  @Get(':id/proposition')
  proposition(
    @Param('id') id: string,
    @Query(new ZodValidationPipe({ schema: filtrePropositionSchema })) filtre: FiltreProposition,
  ): Promise<PropositionCampagne> {
    return this.culturesService.proposition({ id, dateDebut: filtre.dateDebut });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerCultureSchema })) donnees: CreerCulture,
  ): Promise<Culture> {
    return this.culturesService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierCultureSchema })) donnees: ModifierCulture,
  ): Promise<Culture> {
    return this.culturesService.modifier({ id, donnees });
  }
}
