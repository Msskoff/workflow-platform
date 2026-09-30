import { Module } from '@nestjs/common';
import { NoeudsController } from './noeuds.controller';
import { creerRegistreNoeuds, RegistreNoeuds } from './registre-noeuds';

@Module({
  controllers: [NoeudsController],
  providers: [{ provide: RegistreNoeuds, useFactory: creerRegistreNoeuds }],
  exports: [RegistreNoeuds],
})
export class NoeudsModule {}
