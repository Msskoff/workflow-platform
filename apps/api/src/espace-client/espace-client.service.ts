import { Injectable } from '@nestjs/common';
import { decisionClientSchema, type DecisionClient } from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lecture seule pour l'espace client. Seules les décisions `envoyé` sont exposées :
 * un brouillon, une décision validée mais pas encore envoyée ou rejetée n'en sort jamais.
 */
@Injectable()
export class EspaceClientService {
  constructor(private readonly prisma: PrismaService) {}

  async decisionsEnvoyees({ clientId }: { clientId: string }): Promise<DecisionClient[]> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw introuvable({ entite: 'Client', id: clientId });
    }

    const lignes = await this.prisma.decision.findMany({
      where: { statut: 'envoyé', execution: { campagne: { parcelle: { clientId } } } },
      include: { execution: { include: { campagne: { include: { parcelle: true } } } } },
      orderBy: { envoyeeLe: 'desc' },
    });

    // Projection explicite : aucune donnée interne (nœuds, motif, statut) n'est exposée.
    return lignes.map((ligne) =>
      decisionClientSchema.parse({
        id: ligne.id,
        parcelle: {
          id: ligne.execution.campagne.parcelle.id,
          nom: ligne.execution.campagne.parcelle.nom,
        },
        campagne: { id: ligne.execution.campagne.id, nom: ligne.execution.campagne.nom },
        recommandation: ligne.recommandation,
        explication: ligne.explication,
        priorite: ligne.priorite,
        envoyeeLe: ligne.envoyeeLe?.toISOString(),
      }),
    );
  }
}
