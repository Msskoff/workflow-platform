import { Controller, Get } from '@nestjs/common';
import { apiRoutes, type DescripteurNoeud } from '@workflow/shared';
import { RegistreNoeuds } from './registre-noeuds';

@Controller(apiRoutes.noeuds)
export class NoeudsController {
  constructor(private readonly registre: RegistreNoeuds) {}

  /** Catalogue des types de nœuds, pour la palette et la validation de l'éditeur. */
  @Get()
  lister(): DescripteurNoeud[] {
    return this.registre.decrire();
  }
}
