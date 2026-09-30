import { Module } from '@nestjs/common';
import { NoeudsModule } from '../noeuds/noeuds.module';
import { ModelesController } from './modeles.controller';
import { ModelesService } from './modeles.service';

@Module({
  imports: [NoeudsModule],
  controllers: [ModelesController],
  providers: [ModelesService],
  exports: [ModelesService],
})
export class ModelesModule {}
