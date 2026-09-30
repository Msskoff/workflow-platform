import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  apiRoutes,
  creerModeleSchema,
  modifierModeleSchema,
  type CreerModele,
  type ModeleWorkflow,
  type ModifierModele,
  type ResumeModele,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModelesService } from './modeles.service';

@Controller(apiRoutes.modeles)
export class ModelesController {
  constructor(private readonly modelesService: ModelesService) {}

  /** Liste sans les graphes ; le graphe se charge avec `GET /modeles/:id`. */
  @Get()
  lister(): Promise<ResumeModele[]> {
    return this.modelesService.listerResumes();
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<ModeleWorkflow> {
    return this.modelesService.trouver({ id });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerModeleSchema })) donnees: CreerModele,
  ): Promise<ModeleWorkflow> {
    return this.modelesService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierModeleSchema })) donnees: ModifierModele,
  ): Promise<ModeleWorkflow> {
    return this.modelesService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.modelesService.supprimer({ id });
  }
}
