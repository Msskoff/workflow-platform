import { Module } from '@nestjs/common';
import { RapportsModule } from '../rapports/rapports.module';
import { EspaceClientController } from './espace-client.controller';
import { EspaceClientService } from './espace-client.service';

@Module({
  imports: [RapportsModule],
  controllers: [EspaceClientController],
  providers: [EspaceClientService],
})
export class EspaceClientModule {}
