import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  apiRoutes,
  marquerFaitSchema,
  type DecisionClient,
  type MarquerFait,
  type VueEspaceClient,
  type VueParcelleClient,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EspaceClientService } from './espace-client.service';

/**
 * Espace client, en lecture seule à une exception près : la case « fait » d'une
 * recommandation, que le fermier ou l'agent terrain coche après application. L'accès se fait par le jeton du lien envoyé au client :
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

  @Post(':jeton/decisions/:decisionId/fait')
  @HttpCode(200)
  marquerFait(
    @Param('jeton') jeton: string,
    @Param('decisionId') decisionId: string,
    @Body(new ZodValidationPipe({ schema: marquerFaitSchema })) donnees: MarquerFait,
  ): Promise<DecisionClient> {
    return this.espaceClientService.marquerFait({ jeton, decisionId, donnees });
  }
}
