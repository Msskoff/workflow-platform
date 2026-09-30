import { Module } from '@nestjs/common';
import { NoeudsModule } from '../noeuds/noeuds.module';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { LancementService } from './lancement.service';

@Module({
  imports: [NoeudsModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, LancementService],
})
export class ExecutionsModule {}
