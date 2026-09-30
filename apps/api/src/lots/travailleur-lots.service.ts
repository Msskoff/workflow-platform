import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ExecuteurLots } from './executeur-lots.service';

const INTERVALLE_MS = 1_000;

/**
 * Travailleur de la file des lots, dans le processus de l'API : interroge la file chaque
 * seconde et traite jusqu'à `LOTS_CONCURRENCE` tâches en parallèle (2 par défaut).
 * `LOTS_TRAVAILLEUR=desactive` le coupe (outil ponctuel, maintenance).
 */
@Injectable()
export class TravailleurLots implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly journal = new Logger(TravailleurLots.name);
  private readonly concurrence = Math.max(1, Number(process.env.LOTS_CONCURRENCE ?? 2));
  private minuterie: NodeJS.Timeout | null = null;
  private actives = 0;

  constructor(private readonly executeur: ExecuteurLots) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.LOTS_TRAVAILLEUR === 'desactive') {
      this.journal.log('Travailleur des lots désactivé (LOTS_TRAVAILLEUR=desactive)');
      return;
    }
    const reprises = await this.executeur.recupererInterrompues();
    if (reprises > 0) {
      this.journal.warn(`${reprises} tâche(s) interrompue(s) remise(s) en file`);
    }
    this.minuterie = setInterval(() => this.cadencer(), INTERVALLE_MS);
  }

  onApplicationShutdown(): void {
    if (this.minuterie) {
      clearInterval(this.minuterie);
    }
  }

  /** Occupe les emplacements libres ; une tâche terminée enchaîne aussitôt sur la suivante. */
  private cadencer(): void {
    while (this.actives < this.concurrence) {
      this.actives += 1;
      void this.executeur
        .traiterProchaine()
        .then((traitee) => {
          if (traitee) {
            setImmediate(() => this.cadencer());
          }
        })
        .catch((erreur: unknown) => this.journal.error('Erreur du travailleur des lots', erreur))
        .finally(() => {
          this.actives -= 1;
        });
    }
  }
}
