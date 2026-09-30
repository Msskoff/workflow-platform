import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  apiRoutes,
  creerLotSchema,
  type CreerLot,
  type Lot,
  type ResumeLot,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LotsService } from './lots.service';

/**
 * Exécutions par lot. La création rend la main aussitôt : les tâches sont traitées en
 * arrière-plan par le travailleur de l'API ; l'écran de suivi lit `GET /lots/:id`.
 */
@Controller(apiRoutes.lots)
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  lister(): Promise<ResumeLot[]> {
    return this.lotsService.lister();
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Lot> {
    return this.lotsService.trouver({ id });
  }

  @Post()
  creer(@Body(new ZodValidationPipe({ schema: creerLotSchema })) donnees: CreerLot): Promise<Lot> {
    return this.lotsService.creer({ donnees });
  }

  /** Remet en file les parcelles en échec (tentatives remises à zéro). */
  @Post(':id/relancer')
  @HttpCode(200)
  relancer(@Param('id') id: string): Promise<Lot> {
    return this.lotsService.relancerEchecs({ id });
  }
}
