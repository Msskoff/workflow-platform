import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  apiRoutes,
  creerModeleSchema,
  importWorkflowSchema,
  modifierModeleSchema,
  type CreerModele,
  type ImportWorkflow,
  type ResultatImport,
  type ModeleWorkflow,
  type ModifierModele,
  type ResumeModele,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ModelesService } from './modeles.service';

@Controller(apiRoutes.modeles)
export class ModelesController {
  constructor(private readonly modelesService: ModelesService) {}

  /** Liste sans les graphes (`?cultureId=` pour une culture) ; le graphe se charge avec `GET /modeles/:id`. */
  @Get()
  lister(@Query('cultureId') cultureId?: string): Promise<ResumeModele[]> {
    return this.modelesService.listerResumes({ filtre: { cultureId: cultureId || undefined } });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<ModeleWorkflow> {
    return this.modelesService.trouver({ id });
  }

  /** Export JSON versionné, proposé en téléchargement (`workflow-<nom>.json`). */
  @Get(':id/export')
  async exporter(@Param('id') id: string): Promise<StreamableFile> {
    const contenu = await this.modelesService.exporter({ id });
    const fichier = contenu.workflow.nom
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return new StreamableFile(Buffer.from(JSON.stringify(contenu, null, 2), 'utf8'), {
      type: 'application/json; charset=utf-8',
      disposition: `attachment; filename="workflow-${fichier}.json"`,
    });
  }

  /** Import d'un export JSON : crée un nouveau modèle (400 explicite si invalide). */
  @Post('import')
  importer(
    @Body(new ZodValidationPipe({ schema: importWorkflowSchema })) donnees: ImportWorkflow,
  ): Promise<ResultatImport> {
    return this.modelesService.importer({ donnees });
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
