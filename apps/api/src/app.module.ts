import { Module } from '@nestjs/common';
import { CampagnesModule } from './campagnes/campagnes.module';
import { ClientsModule } from './clients/clients.module';
import { DecisionsModule } from './decisions/decisions.module';
import { DonneesBrutesModule } from './donnees-brutes/donnees-brutes.module';
import { EspaceClientModule } from './espace-client/espace-client.module';
import { ExecutionsModule } from './executions/executions.module';
import { HealthModule } from './health/health.module';
import { ModelesModule } from './modeles/modeles.module';
import { NoeudsModule } from './noeuds/noeuds.module';
import { ParcellesModule } from './parcelles/parcelles.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    ClientsModule,
    ParcellesModule,
    CampagnesModule,
    DonneesBrutesModule,
    ExecutionsModule,
    DecisionsModule,
    NoeudsModule,
    ModelesModule,
    EspaceClientModule,
  ],
})
export class AppModule {}
