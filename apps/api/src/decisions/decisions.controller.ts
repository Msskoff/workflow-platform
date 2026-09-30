import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  apiRoutes,
  creerDecisionSchema,
  filtreDecisionsSchema,
  modifierDecisionSchema,
  type CreerDecision,
  type Decision,
  type FiltreDecisions,
  type ModifierDecision,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DecisionsService } from './decisions.service';

@Controller(apiRoutes.decisions)
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreDecisionsSchema })) filtre: FiltreDecisions,
  ): Promise<Decision[]> {
    return this.decisionsService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Decision> {
    return this.decisionsService.trouver({ id });
  }

  /** Photo jointe au réel d'une application (usage interne : écran de suivi). */
  @Get(':id/photo')
  @Header('Cache-Control', 'private, max-age=3600')
  async photo(@Param('id') id: string): Promise<StreamableFile> {
    const { contenu, type } = await this.decisionsService.photo({ id });
    return new StreamableFile(contenu, { type });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerDecisionSchema })) donnees: CreerDecision,
  ): Promise<Decision> {
    return this.decisionsService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierDecisionSchema })) donnees: ModifierDecision,
  ): Promise<Decision> {
    return this.decisionsService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.decisionsService.supprimer({ id });
  }
}
