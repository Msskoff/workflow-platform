import { Module } from '@nestjs/common';
import { CulturesModule } from '../cultures/cultures.module';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';

@Module({
  imports: [CulturesModule],
  controllers: [CampagnesController],
  providers: [CampagnesService],
})
export class CampagnesModule {}
