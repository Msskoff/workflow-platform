import { Controller, Get, Query } from '@nestjs/common';
import {
  apiRoutes,
  filtreRevueSchema,
  type DecisionEnRevue,
  type FiltreRevue,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RevueService } from './revue.service';

/**
 * Écran de revue interne. Les actions (valider, rejeter, envoyer, modifier l'explication)
 * passent par `PATCH /decisions/:id`, qui applique les transitions de statut.
 */
@Controller(apiRoutes.revueDecisions)
export class RevueController {
  constructor(private readonly revueService: RevueService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreRevueSchema })) filtre: FiltreRevue,
  ): Promise<DecisionEnRevue[]> {
    return this.revueService.lister({ filtre });
  }
}
