import { Injectable, NotFoundException } from '@nestjs/common';
import {
  prioriteDecisionSchema,
  rangPriorite,
  rapportParcelleSchema,
  statutsVisiblesClient,
  workflowSnapshotSchema,
  type RapportParcelle,
  type StatutDecision,
} from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import { PrismaService } from '../prisma/prisma.service';
import { genererRapportPdf, type DonneesRapportPdf } from './generer-rapport-pdf';

/** Type du nœud qui fige le contenu du rapport. */
export const TYPE_NOEUD_RAPPORT = 'restitution.rapport_pdf';

export interface FichierPdf {
  contenu: Buffer;
  nomFichier: string;
}

/** Nom de fichier sans accents ni caractères spéciaux. */
function nomFichier({ parcelle, date }: { parcelle: string; date: string }): string {
  const lisible = parcelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `rapport-${lisible || 'parcelle'}-${date.slice(0, 10)}.pdf`;
}

interface RapportExecutionParams {
  executionId: string;
  /** Statuts des décisions à inclure. */
  statuts: readonly StatutDecision[];
  destination: DonneesRapportPdf['destination'];
}

/**
 * Rapports PDF : contenu figé par le nœud Rapport PDF d'une exécution, complété des
 * décisions de cette exécution selon leur statut (validées pour l'aperçu interne,
 * envoyées pour le client), les plus prioritaires d'abord.
 */
@Injectable()
export class RapportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Contenu du rapport d'une exécution, ou `null` si elle n'a pas de nœud Rapport PDF. */
  static rapportDeLExecution({
    snapshot,
    noeuds,
  }: {
    snapshot: unknown;
    noeuds: readonly { noeudId: string; statut: string; sorties: unknown }[];
  }): RapportParcelle | null {
    const noeudRapport = workflowSnapshotSchema
      .parse(snapshot)
      .noeuds.find((noeud) => noeud.type === TYPE_NOEUD_RAPPORT);
    const etat = noeuds.find((candidat) => candidat.noeudId === noeudRapport?.id);
    if (!etat || etat.statut !== 'ok') {
      return null;
    }
    const sorties = etat.sorties as { rapport?: unknown } | null;
    const rapport = rapportParcelleSchema.safeParse(sorties?.rapport);
    return rapport.success ? rapport.data : null;
  }

  /** Aperçu interne : décisions validées ou envoyées. */
  apercu({ executionId }: { executionId: string }): Promise<FichierPdf> {
    return this.pdf({
      executionId,
      statuts: ['validé', ...statutsVisiblesClient],
      destination: 'apercu',
    });
  }

  /** Version client : décisions envoyées uniquement. */
  versionClient({ executionId }: { executionId: string }): Promise<FichierPdf> {
    return this.pdf({ executionId, statuts: statutsVisiblesClient, destination: 'client' });
  }

  private async pdf(params: RapportExecutionParams): Promise<FichierPdf> {
    const { donnees, nomFichier: nom } = await this.preparer(params);
    return { contenu: await genererRapportPdf({ donnees }), nomFichier: nom };
  }

  /**
   * Données du rapport : contenu figé par le nœud Rapport PDF et décisions retenues
   * (statuts demandés, les plus prioritaires d'abord, dans la limite du rapport).
   */
  async preparer({
    executionId,
    statuts,
    destination,
  }: RapportExecutionParams): Promise<{ donnees: DonneesRapportPdf; nomFichier: string }> {
    const execution = await this.prisma.executionWorkflow.findUnique({
      where: { id: executionId },
      include: {
        noeuds: true,
        campagne: { include: { parcelle: { include: { client: true } } } },
        decisions: {
          omit: { reelPhoto: true },
          where: { statut: { in: [...statuts] } },
          orderBy: { creeLe: 'asc' },
        },
      },
    });
    if (!execution) {
      throw introuvable({ entite: 'Exécution', id: executionId });
    }
    const rapport = RapportsService.rapportDeLExecution({
      snapshot: execution.snapshot,
      noeuds: execution.noeuds,
    });
    if (!rapport) {
      throw new NotFoundException(
        `L’exécution ${executionId} n’a pas de nœud « Rapport PDF » terminé : aucun rapport à produire`,
      );
    }

    const rang = (priorite: string | null) =>
      rangPriorite({ priorite: prioriteDecisionSchema.safeParse(priorite).data ?? null });
    const decisions = [...execution.decisions]
      .sort((a, b) => rang(a.priorite) - rang(b.priorite))
      .slice(0, rapport.nombreMaxDecisions)
      .map((decision) => ({
        recommandation: decision.recommandation,
        explication: decision.explication,
        priorite: prioriteDecisionSchema.safeParse(decision.priorite).data ?? null,
      }));

    const { campagne } = execution;
    return {
      donnees: {
        rapport,
        client: { nom: campagne.parcelle.client.nom },
        parcelle: { nom: campagne.parcelle.nom },
        campagne: { nom: campagne.nom, culture: campagne.culture },
        decisions,
        destination,
      },
      nomFichier: nomFichier({ parcelle: campagne.parcelle.nom, date: rapport.genereLe }),
    };
  }
}
