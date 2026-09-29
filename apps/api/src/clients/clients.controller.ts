import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  apiRoutes,
  creerClientSchema,
  filtreClientsSchema,
  modifierClientSchema,
  type Client,
  type CreerClient,
  type FiltreClients,
  type ModifierClient,
} from '@workflow/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ClientsService } from './clients.service';

@Controller(apiRoutes.clients)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  lister(
    @Query(new ZodValidationPipe({ schema: filtreClientsSchema })) filtre: FiltreClients,
  ): Promise<Client[]> {
    return this.clientsService.lister({ filtre });
  }

  @Get(':id')
  trouver(@Param('id') id: string): Promise<Client> {
    return this.clientsService.trouver({ id });
  }

  @Post()
  creer(
    @Body(new ZodValidationPipe({ schema: creerClientSchema })) donnees: CreerClient,
  ): Promise<Client> {
    return this.clientsService.creer({ donnees });
  }

  @Patch(':id')
  modifier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe({ schema: modifierClientSchema })) donnees: ModifierClient,
  ): Promise<Client> {
    return this.clientsService.modifier({ id, donnees });
  }

  @Delete(':id')
  @HttpCode(204)
  supprimer(@Param('id') id: string): Promise<void> {
    return this.clientsService.supprimer({ id });
  }
}
