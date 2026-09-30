import { Module } from '@nestjs/common';
import { ModelesModule } from '../modeles/modeles.module';
import { CulturesController } from './cultures.controller';
import { CulturesService } from './cultures.service';

@Module({
  imports: [ModelesModule],
  controllers: [CulturesController],
  providers: [CulturesService],
  exports: [CulturesService],
})
export class CulturesModule {}
