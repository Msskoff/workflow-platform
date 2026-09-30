import { Module } from '@nestjs/common';
import { DecisionsModule } from '../decisions/decisions.module';
import { RapportsModule } from '../rapports/rapports.module';
import { EspaceClientController } from './espace-client.controller';
import { EspaceClientService } from './espace-client.service';

@Module({
  imports: [RapportsModule, DecisionsModule],
  controllers: [EspaceClientController],
  providers: [EspaceClientService],
})
export class EspaceClientModule {}
