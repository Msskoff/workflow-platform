import { Injectable } from '@nestjs/common';
import {
  calculerIndicateursSuivi,
  resumeSuiviCampagneSchema,
  suiviCampagneSchema,
  type ResumeSuiviCampagne,
  type SuiviCampagne,
} from '@workflow/shared';
import { enIsoOuNull } from '../common/dates';
import { introuvable } from '../common/erreurs';
import { SANS_PHOTO, versDecision } from '../decisions/decisions.mapper';
import { PrismaService } from '../prisma/prisma.service';

/** Décisions d'une campagne, rejetées exclues (jamais conseillées). */
const INCLURE_DECISIONS = {
  executions: {
    include: {
      decisions: {
        ...SANS_PHOTO,
        where: { statut: { not: 'rejeté' } },
        orderBy: { creeLe: 'asc' },
      },
    },
    orderBy: { creeLe: 'asc' },
  },
  parcelle: { include: { client: true } },
} as const;

/**
 * Suivi de campagne (écran interne) : par parcelle et campagne, ce qui a été conseillé,
 * appliqué, et ce qui reste à faire, avec le taux d'application et les écarts prévu/réel.
 */
@Injectable()
export class SuiviService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toutes les campagnes, les plus récentes d'abord, avec leurs indicateurs. */
  async lister(): Promise<ResumeSuiviCampagne[]> {
    const campagnes = await this.prisma.campagne.findMany({
      include: INCLURE_DECISIONS,
      orderBy: [{ dateDebut: 'desc' }, { creeLe: 'desc' }],
    });
    return campagnes.map((campagne) => {
      const decisions = campagne.executions.flatMap((execution) =>
        execution.decisions.map((ligne) => versDecision({ ligne })),
      );
      return resumeSuiviCampagneSchema.parse({
        ...SuiviService.contexte({ campagne }),
        indicateurs: calculerIndicateursSuivi({ decisions }),
      });
    });
  }

  async detail({ campagneId }: { campagneId: string }): Promise<SuiviCampagne> {
    const campagne = await this.prisma.campagne.findUnique({
      where: { id: campagneId },
      include: INCLURE_DECISIONS,
    });
    if (!campagne) {
      throw introuvable({ entite: 'Campagne', id: campagneId });
    }
    const decisions = campagne.executions.flatMap((execution) =>
      execution.decisions.map((ligne) => ({
        decision: versDecision({ ligne }),
        analyse: {
          id: execution.id,
          version: execution.version,
          termineeLe: enIsoOuNull({ date: execution.termineeLe }),
        },
      })),
    );
    return suiviCampagneSchema.parse({
      ...SuiviService.contexte({ campagne }),
      indicateurs: calculerIndicateursSuivi({
        decisions: decisions.map((element) => element.decision),
      }),
      decisions,
    });
  }

  private static contexte({
    campagne,
  }: {
    campagne: {
      id: string;
      nom: string;
      culture: string | null;
      dateDebut: string;
      dateFin: string | null;
      parcelle: { id: string; nom: string; surfaceHa: number; client: { id: string; nom: string } };
    };
  }) {
    const { parcelle } = campagne;
    return {
      client: { id: parcelle.client.id, nom: parcelle.client.nom },
      parcelle: { id: parcelle.id, nom: parcelle.nom, surfaceHa: parcelle.surfaceHa },
      campagne: {
        id: campagne.id,
        nom: campagne.nom,
        culture: campagne.culture,
        dateDebut: campagne.dateDebut,
        dateFin: campagne.dateFin,
      },
    };
  }
}
