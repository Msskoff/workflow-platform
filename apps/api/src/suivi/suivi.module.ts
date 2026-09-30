import { Module } from '@nestjs/common';
import { SuiviController } from './suivi.controller';
import { SuiviService } from './suivi.service';

@Module({
  controllers: [SuiviController],
  providers: [SuiviService],
})
export class SuiviModule {}
