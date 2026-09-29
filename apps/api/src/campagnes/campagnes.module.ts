import { Module } from '@nestjs/common';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';

@Module({
  controllers: [CampagnesController],
  providers: [CampagnesService],
})
export class CampagnesModule {}
