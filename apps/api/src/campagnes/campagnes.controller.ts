import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  creerCampagneSchema,
  filtreCampagnesSchema,
  modifierCampagneSchema,
  type Campagne,
  type CreerCampagne,
  type FiltreCampagnes,
  type ModifierCampagne,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CampagnesService } from './campagnes.service';

@Controller(apiRoutes.campagnes)
export class CampagnesController {
  constructor(private readonly campagnesService: CampagnesService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreCampagnesSchema })) filtre: FiltreCampagnes,
  ): Promise<Campagne[]> {
    return this.campagnesService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Campagne> {
    return this.campagnesService.trouver({ id });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerCampagneSchema })) donnees: CreerCampagne,
  ): Promise<Campagne> {
    return this.campagnesService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierCampagneSchema })) donnees: ModifierCampagne,
  ): Promise<Campagne> {
    return this.campagnesService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.campagnesService.supprimer({ id });
  }
}
