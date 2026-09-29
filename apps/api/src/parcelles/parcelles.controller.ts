import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  creerParcelleSchema,
  filtreParcellesSchema,
  modifierParcelleSchema,
  type CreerParcelle,
  type FiltreParcelles,
  type ModifierParcelle,
  type Parcelle,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ParcellesService } from './parcelles.service';

@Controller(apiRoutes.parcelles)
export class ParcellesController {
  constructor(private readonly parcellesService: ParcellesService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreParcellesSchema })) filtre: FiltreParcelles,
  ): Promise<Parcelle[]> {
    return this.parcellesService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Parcelle> {
    return this.parcellesService.trouver({ id });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerParcelleSchema })) donnees: CreerParcelle,
  ): Promise<Parcelle> {
    return this.parcellesService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierParcelleSchema })) donnees: ModifierParcelle,
  ): Promise<Parcelle> {
    return this.parcellesService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.parcellesService.supprimer({ id });
  }
}
