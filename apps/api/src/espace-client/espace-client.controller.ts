import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { apiRoutes, type VueEspaceClient, type VueParcelleClient } from '@workflow/shared';
import { EspaceClientService } from './espace-client.service';

/**
 * Espace client, lecture seule. L'accès se fait par le jeton du lien envoyé au client :
 * pas de compte ni de mot de passe, et le lien se révoque en en générant un nouveau.
 */
@Controller(apiRoutes.espaceClient)
export class EspaceClientController {
  constructor(private readonly espaceClientService: EspaceClientService) {}

  @Get(':jeton')
  vue(@Param('jeton') jeton: string): Promise<VueEspaceClient> {
    return this.espaceClientService.vue({ jeton });
  }

  @Get(':jeton/parcelles/:parcelleId')
  parcelle(
    @Param('jeton') jeton: string,
    @Param('parcelleId') parcelleId: string,
  ): Promise<VueParcelleClient> {
    return this.espaceClientService.vueParcelle({ jeton, parcelleId });
  }

  @Get(':jeton/parcelles/:parcelleId/rapport.pdf')
  async rapport(
    @Param('jeton') jeton: string,
    @Param('parcelleId') parcelleId: string,
    @Query('analyse') analyseId?: string,
  ): Promise<StreamableFile> {
    const { contenu, nomFichier } = await this.espaceClientService.rapportPdf({
      jeton,
      parcelleId,
      analyseId,
    });
    return new StreamableFile(contenu, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nomFichier}"`,
    });
  }
}
