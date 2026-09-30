import { Controller, Get, Param } from '@nestjs/common';
import { apiRoutes, type ResumeSuiviCampagne, type SuiviCampagne } from '@workflow/shared';
import { SuiviService } from './suivi.service';

/**
 * Suivi de campagne, écran interne. Les actions (application, non-application, saisie du
 * réel) passent par `PATCH /decisions/:id`, qui applique les transitions de statut.
 */
@Controller(apiRoutes.suiviCampagnes)
export class SuiviController {
  constructor(private readonly suiviService: SuiviService) {}

  @Get()
  lister(): Promise<ResumeSuiviCampagne[]> {
    return this.suiviService.lister();
  }

  @Get(':campagneId')
  detail(@Param('campagneId') campagneId: string): Promise<SuiviCampagne> {
    return this.suiviService.detail({ campagneId });
  }
}
