import { Module } from '@nestjs/common';
import { EspaceClientController } from './espace-client.controller';
import { EspaceClientService } from './espace-client.service';

@Module({
  controllers: [EspaceClientController],
  providers: [EspaceClientService],
})
export class EspaceClientModule {}
