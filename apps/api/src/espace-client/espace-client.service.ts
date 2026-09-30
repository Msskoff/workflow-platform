import { Injectable, NotFoundException } from '@nestjs/common';
import {
  decisionClientSchema,
  formaterNombre,
  vueEspaceClientSchema,
  vueParcelleClientSchema,
  type AnalysePubliee,
  type DecisionClient,
  type EvenementChronologie,
  type VueEspaceClient,
  type VueParcelleClient,
} from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import { empreinteJeton } from '../common/jeton';
import type { Client as ClientLigne } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RapportsService, type FichierPdf } from '../rapports/rapports.service';

const MESSAGE_LIEN_INVALIDE =
  'Lien d’accès invalide ou expiré : demandez un nouveau lien à votre conseiller';

/**
 * Espace client, en lecture seule. Le client est identifié par le jeton de son lien d'accès.
 * Il ne voit que les analyses « publiées » (exécutions terminées ayant au moins une décision
 * envoyée) et les décisions envoyées : rien de ce qui est en cours de revue.
 */
@Injectable()
export class EspaceClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rapports: RapportsService,
  ) {}

  async vue({ jeton }: { jeton: string }): Promise<VueEspaceClient> {
    const client = await this.resoudreClient({ jeton });
    const parcelles = await this.prisma.parcelle.findMany({
      where: { clientId: client.id },
      include: { campagnes: { orderBy: { dateDebut: 'desc' } } },
      orderBy: { nom: 'asc' },
    });
    const dernieres = await Promise.all(
      parcelles.map((parcelle) => this.analysesPubliees({ parcelleId: parcelle.id })),
    );
    return vueEspaceClientSchema.parse({
      client: { nom: client.nom },
      parcelles: parcelles.map((parcelle, index) => ({
        id: parcelle.id,
        nom: parcelle.nom,
        surfaceHa: parcelle.surfaceHa,
        campagnes: parcelle.campagnes.map(({ id, nom, culture, dateDebut, dateFin }) => ({
          id,
          nom,
          culture,
          dateDebut,
          dateFin,
        })),
        derniereAnalyse: dernieres[index]?.[0]?.date ?? null,
      })),
    });
  }

  async vueParcelle({
    jeton,
    parcelleId,
  }: {
    jeton: string;
    parcelleId: string;
  }): Promise<VueParcelleClient> {
    const client = await this.resoudreClient({ jeton });
    const parcelle = await this.prisma.parcelle.findFirst({
      where: { id: parcelleId, clientId: client.id },
      include: { campagnes: { orderBy: { dateDebut: 'asc' } } },
    });
    if (!parcelle) {
      throw new NotFoundException('Parcelle introuvable');
    }
    const analyses = await this.analysesPubliees({ parcelleId });
    const decisions = await this.decisionsEnvoyees({ clientId: client.id, parcelleId });
    const campagnes = parcelle.campagnes.map(({ id, nom, culture, dateDebut, dateFin }) => ({
      id,
      nom,
      culture,
      dateDebut,
      dateFin,
    }));

    const chronologie: EvenementChronologie[] = [
      ...campagnes.flatMap((campagne) => [
        {
          date: campagne.dateDebut,
          type: 'debut_campagne' as const,
          titre: `Début de la campagne ${campagne.nom}`,
          detail: campagne.culture ? `Culture : ${campagne.culture}` : null,
          campagneId: campagne.id,
          analyseId: null,
        },
        ...(campagne.dateFin
          ? [
              {
                date: campagne.dateFin,
                type: 'fin_campagne' as const,
                titre: `Fin de la campagne ${campagne.nom}`,
                detail: null,
                campagneId: campagne.id,
                analyseId: null,
              },
            ]
          : []),
      ]),
      ...analyses.map((analyse) => ({
        date: analyse.date,
        type: 'analyse' as const,
        titre: 'Analyse satellite de la parcelle',
        detail: [
          analyse.rapport.indicateurs.ndviMoyen !== undefined &&
            `Vigueur moyenne ${formaterNombre({ nombre: analyse.rapport.indicateurs.ndviMoyen })}`,
          analyse.rapport.carte.zonage && `${analyse.rapport.carte.zonage.zones.length} zones`,
        ]
          .filter(Boolean)
          .join(' · '),
        campagneId: analyse.campagneId,
        analyseId: analyse.id,
      })),
      ...decisions.map((decision) => ({
        date: decision.envoyeeLe,
        type: 'decision' as const,
        titre: decision.recommandation ?? 'Recommandation',
        detail: decision.explication,
        campagneId: decision.campagne.id,
        analyseId: decision.analyseId,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return vueParcelleClientSchema.parse({
      client: { nom: client.nom },
      parcelle: { id: parcelle.id, nom: parcelle.nom, surfaceHa: parcelle.surfaceHa },
      campagnes,
      analyses,
      decisions,
      chronologie,
    });
  }

  /** Rapport PDF d'une analyse publiée (la plus récente par défaut), décisions envoyées uniquement. */
  async rapportPdf({
    jeton,
    parcelleId,
    analyseId,
  }: {
    jeton: string;
    parcelleId: string;
    analyseId?: string;
  }): Promise<FichierPdf> {
    const { analyses } = await this.vueParcelle({ jeton, parcelleId });
    const analyse = analyseId
      ? analyses.find((candidate) => candidate.id === analyseId)
      : analyses[0];
    if (!analyse) {
      throw new NotFoundException('Aucun rapport disponible pour cette parcelle');
    }
    return this.rapports.versionClient({ executionId: analyse.id });
  }

  /** Décisions envoyées d'un client (éventuellement d'une parcelle), sans données internes. */
  async decisionsEnvoyees({
    clientId,
    parcelleId,
  }: {
    clientId: string;
    parcelleId?: string;
  }): Promise<DecisionClient[]> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw introuvable({ entite: 'Client', id: clientId });
    }
    const lignes = await this.prisma.decision.findMany({
      where: {
        statut: 'envoyé',
        execution: { campagne: { parcelle: { clientId, ...(parcelleId && { id: parcelleId }) } } },
      },
      include: { execution: { include: { campagne: { include: { parcelle: true } } } } },
      orderBy: { envoyeeLe: 'desc' },
    });

    // Projection explicite : aucune donnée interne (nœuds, motif, statut) n'est exposée.
    return lignes.map((ligne) =>
      decisionClientSchema.parse({
        id: ligne.id,
        analyseId: ligne.executionId,
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

  private async resoudreClient({ jeton }: { jeton: string }): Promise<ClientLigne> {
    const client = jeton.trim()
      ? await this.prisma.client.findUnique({
          where: { jetonAccesHash: empreinteJeton({ jeton }) },
        })
      : null;
    if (!client) {
      throw new NotFoundException(MESSAGE_LIEN_INVALIDE);
    }
    return client;
  }

  /** Exécutions terminées d'une parcelle ayant au moins une décision envoyée et un rapport. */
  private async analysesPubliees({
    parcelleId,
  }: {
    parcelleId: string;
  }): Promise<AnalysePubliee[]> {
    const executions = await this.prisma.executionWorkflow.findMany({
      where: {
        statut: 'terminee',
        campagne: { parcelleId },
        decisions: { some: { statut: 'envoyé' } },
      },
      include: { noeuds: true },
      orderBy: { termineeLe: 'desc' },
    });
    return executions.flatMap((execution) => {
      const rapport = RapportsService.rapportDeLExecution({
        snapshot: execution.snapshot,
        noeuds: execution.noeuds,
      });
      return rapport && execution.termineeLe
        ? [
            {
              id: execution.id,
              campagneId: execution.campagneId,
              date: execution.termineeLe.toISOString(),
              rapport,
            },
          ]
        : [];
    });
  }
}
