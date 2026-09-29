import { Module } from '@nestjs/common';
import { DonneesBrutesController } from './donnees-brutes.controller';
import { DonneesBrutesService } from './donnees-brutes.service';

@Module({
  controllers: [DonneesBrutesController],
  providers: [DonneesBrutesService],
})
export class DonneesBrutesModule {}
