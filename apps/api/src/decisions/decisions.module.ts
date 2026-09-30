import { Module } from '@nestjs/common';
import { NoeudsModule } from '../noeuds/noeuds.module';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { RevueController } from './revue.controller';
import { RevueService } from './revue.service';

@Module({
  imports: [NoeudsModule],
  controllers: [DecisionsController, RevueController],
  providers: [DecisionsService, RevueService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
