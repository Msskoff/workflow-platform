import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { apiRoutes } from '@workflow/shared';
import { RapportsService } from './rapports.service';

/** Aperçu interne du rapport d'une exécution (décisions validées ou envoyées). */
@Controller(apiRoutes.executions)
export class RapportsController {
  constructor(private readonly rapportsService: RapportsService) {}

  @Get(':id/rapport.pdf')
  async apercu(@Param('id') id: string): Promise<StreamableFile> {
    const { contenu, nomFichier } = await this.rapportsService.apercu({ executionId: id });
    return new StreamableFile(contenu, {
      type: 'application/pdf',
      disposition: `inline; filename="${nomFichier}"`,
    });
  }
}
