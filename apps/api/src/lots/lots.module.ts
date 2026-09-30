import { Module } from '@nestjs/common';
import { ExecutionsModule } from '../executions/executions.module';
import { ModelesModule } from '../modeles/modeles.module';
import { ExecuteurLots } from './executeur-lots.service';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';
import { TravailleurLots } from './travailleur-lots.service';

@Module({
  imports: [ExecutionsModule, ModelesModule],
  controllers: [LotsController],
  providers: [LotsService, ExecuteurLots, TravailleurLots],
})
export class LotsModule {}
