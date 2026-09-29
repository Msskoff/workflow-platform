import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  filtreDonneesBrutesSchema,
  importerDonneeBruteSchema,
  type DonneeBrute,
  type FiltreDonneesBrutes,
  type ImporterDonneeBrute,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DonneesBrutesService } from './donnees-brutes.service';

/** Pas de PATCH ni de DELETE : les données brutes sont immuables. */
@Controller(apiRoutes.donneesBrutes)
export class DonneesBrutesController {
  constructor(private readonly donneesBrutesService: DonneesBrutesService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreDonneesBrutesSchema }))
    filtre: FiltreDonneesBrutes,
  ): Promise<DonneeBrute[]> {
    return this.donneesBrutesService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<DonneeBrute> {
    return this.donneesBrutesService.trouver({ id });
  }

  @Post()
  importer(
    @Body(new ZodValidationPipe({ schema: importerDonneeBruteSchema }))
    donnees: ImporterDonneeBrute,
  ): Promise<DonneeBrute> {
    return this.donneesBrutesService.importer({ donnees });
  }
}
