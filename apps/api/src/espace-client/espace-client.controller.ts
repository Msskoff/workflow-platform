import { Controller, Get, Param } from '@nestjs/common';
import { apiRoutes, type DecisionClient } from '@workflow/shared';
import { EspaceClientService } from './espace-client.service';

/** Routes lues par l'espace client (lecture seule, décisions envoyées uniquement). */
@Controller(apiRoutes.espaceClient)
export class EspaceClientController {
  constructor(private readonly espaceClientService: EspaceClientService) {}

  @Get('clients/:clientId/decisions')
  decisions(@Param('clientId') clientId: string): Promise<DecisionClient[]> {
    return this.espaceClientService.decisionsEnvoyees({ clientId });
  }
}
