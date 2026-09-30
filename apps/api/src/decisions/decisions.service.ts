import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  peutTransitionner,
  TAILLE_MAX_PHOTO_OCTETS,
  transitionsStatutDecision,
  type CreerDecision,
  type Decision,
  type DeclarantApplication,
  type ExecutionWorkflow,
  type FiltreDecisions,
  type ModifierDecision,
  type PhotoApplication,
  type SaisieReel,
  type StatutDecision,
  type VoletPrevu,
} from '@workflow/shared';
import { introuvable } from '../common/erreurs';
import type { ServiceCrud } from '../common/service-crud';
import { INCLURE_ETATS_NOEUDS, versExecutionWorkflow } from '../executions/executions.mapper';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SANS_PHOTO, versDecision } from './decisions.mapper';

interface VerifierNoeudsParams {
  execution: ExecutionWorkflow;
  noeudIds: readonly string[];
}

/** Statuts où le prévu reste modifiable : tant que le client n'a rien reçu. */
const STATUTS_PREVU_MODIFIABLE: readonly StatutDecision[] = ['brouillon', 'validé'];

/** Signatures des formats d'image acceptés (le type déclaré doit correspondre au contenu). */
const SIGNATURES_PHOTO: Readonly<Record<PhotoApplication['type'], (octets: Buffer) => boolean>> = {
  'image/jpeg': (octets) => octets.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/png': (octets) => octets.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/webp': (octets) =>
    octets.subarray(0, 4).toString('latin1') === 'RIFF' &&
    octets.subarray(8, 12).toString('latin1') === 'WEBP',
};

export interface PhotoDecision {
  contenu: Buffer;
  type: string;
}

interface ModifierParams {
  id: string;
  donnees: ModifierDecision;
  /** Qui déclare une application : l'équipe (par défaut) ou l'espace client. */
  declarant?: DeclarantApplication;
}

@Injectable()
export class DecisionsService implements ServiceCrud<
  Decision,
  CreerDecision,
  ModifierDecision,
  FiltreDecisions
> {
  constructor(private readonly prisma: PrismaService) {}

  async lister({ filtre }: { filtre: FiltreDecisions }): Promise<Decision[]> {
    const lignes = await this.prisma.decision.findMany({
      ...SANS_PHOTO,
      where: { executionId: filtre.executionId, statut: filtre.statut },
      orderBy: { creeLe: 'asc' },
    });
    return lignes.map((ligne) => versDecision({ ligne }));
  }

  async trouver({ id }: { id: string }): Promise<Decision> {
    const ligne = await this.prisma.decision.findUnique({ ...SANS_PHOTO, where: { id } });
    if (!ligne) {
      throw introuvable({ entite: 'Décision', id });
    }
    return versDecision({ ligne });
  }

  /** Toujours créée en `brouillon`, par une exécution non échouée, à partir de nœuds de son snapshot. */
  async creer({ donnees }: { donnees: CreerDecision }): Promise<Decision> {
    const execution = await this.chargerExecution({ id: donnees.executionId });
    if (execution.statut === 'echouee') {
      throw new ConflictException(
        `L'exécution ${execution.id} a échoué : elle ne peut pas produire de décision`,
      );
    }
    this.verifierNoeuds({ execution, noeudIds: donnees.noeudIds });

    const ligne = await this.prisma.decision.create({
      ...SANS_PHOTO,
      data: {
        executionId: donnees.executionId,
        noeudIds: donnees.noeudIds,
        explication: donnees.explication,
        recommandation: donnees.recommandation ?? null,
        priorite: donnees.priorite ?? null,
        donnees: donnees.donnees,
      },
    });
    return versDecision({ ligne });
  }

  /**
   * Règles, dans l'ordre :
   * - contenu (explication, nœuds) modifiable en `brouillon` seulement ;
   * - prévu modifiable tant que la décision n'est pas envoyée ;
   * - réel saisi uniquement pour une décision qui est (ou devient) `appliqué` ;
   * - statut selon `transitionsStatutDecision` ; `non_appliqué` exige un motif ;
   * - `appliqué → envoyé` (case « fait » décochée) refusé une fois le réel saisi.
   * Les dates de chaque étape sont posées par l'API.
   */
  async modifier({ id, donnees, declarant = 'equipe' }: ModifierParams): Promise<Decision> {
    const actuelle = await this.trouver({ id });
    const { explication, noeudIds, statut, motifRejet, prevu, reel, motifNonApplication } = donnees;
    const changeDeStatut = statut !== undefined && statut !== actuelle.statut;
    const statutFinal = statut ?? actuelle.statut;

    if (motifRejet !== undefined && statut !== 'rejeté') {
      throw new BadRequestException('Le motif de rejet n’est accepté qu’avec le statut « rejeté »');
    }
    if (motifNonApplication !== undefined && statutFinal !== 'non_appliqué') {
      throw new BadRequestException(
        'Le motif de non-application n’est accepté qu’avec le statut « non_appliqué »',
      );
    }
    if (changeDeStatut && statut === 'non_appliqué' && motifNonApplication === undefined) {
      throw new BadRequestException(
        'Indiquez pourquoi la recommandation n’a pas été appliquée (motif obligatoire)',
      );
    }
    if ((explication !== undefined || noeudIds !== undefined) && actuelle.statut !== 'brouillon') {
      throw new ConflictException(
        `La décision ${id} est « ${actuelle.statut} » : son contenu n'est plus modifiable`,
      );
    }
    if (prevu !== undefined && !STATUTS_PREVU_MODIFIABLE.includes(actuelle.statut)) {
      throw new ConflictException(
        `La décision ${id} est « ${actuelle.statut} » : le prévu n'est plus modifiable après l'envoi`,
      );
    }
    if (reel !== undefined && statutFinal !== 'appliqué') {
      throw new ConflictException(
        'Le réel ne se saisit que pour une décision appliquée (ou avec le passage à « appliqué »)',
      );
    }
    if (noeudIds !== undefined) {
      const execution = await this.chargerExecution({ id: actuelle.executionId });
      this.verifierNoeuds({ execution, noeudIds });
    }
    if (
      changeDeStatut &&
      !peutTransitionner({
        transitions: transitionsStatutDecision,
        depuis: actuelle.statut,
        vers: statut,
      })
    ) {
      throw new ConflictException(
        `Transition de statut interdite : ${actuelle.statut} → ${statut}`,
      );
    }
    if (changeDeStatut && actuelle.statut === 'appliqué' && actuelle.reel !== null) {
      throw new ConflictException(
        'Le réel de cette application est déjà saisi : elle ne peut plus être annulée',
      );
    }

    const maintenant = new Date();
    const ligne = await this.prisma.decision.update({
      ...SANS_PHOTO,
      where: { id },
      data: {
        explication,
        noeudIds,
        ...(prevu && DecisionsService.colonnesPrevu({ prevu })),
        ...(reel && DecisionsService.colonnesReel({ reel })),
        ...(motifNonApplication !== undefined && { motifNonApplication }),
        ...(changeDeStatut && { statut }),
        ...(changeDeStatut && statut === 'validé' && { valideeLe: maintenant }),
        ...(changeDeStatut &&
          statut === 'envoyé' &&
          (actuelle.statut === 'appliqué'
            ? { appliqueeLe: null, applicationDeclareePar: null }
            : { envoyeeLe: maintenant })),
        ...(changeDeStatut &&
          statut === 'appliqué' && { appliqueeLe: maintenant, applicationDeclareePar: declarant }),
        ...(changeDeStatut && statut === 'non_appliqué' && { nonAppliqueeLe: maintenant }),
        ...(changeDeStatut &&
          statut === 'rejeté' && { rejeteeLe: maintenant, motifRejet: motifRejet ?? null }),
      },
    });
    return versDecision({ ligne });
  }

  /** Photo de l'application, si elle a été jointe au réel. */
  async photo({ id }: { id: string }): Promise<PhotoDecision> {
    const ligne = await this.prisma.decision.findUnique({
      where: { id },
      select: { reelPhoto: true, reelPhotoType: true },
    });
    if (!ligne) {
      throw introuvable({ entite: 'Décision', id });
    }
    if (!ligne.reelPhoto || !ligne.reelPhotoType) {
      throw new NotFoundException(`La décision ${id} n'a pas de photo d'application`);
    }
    return { contenu: Buffer.from(ligne.reelPhoto), type: ligne.reelPhotoType };
  }

  /** Seul un brouillon peut être supprimé : une décision validée ou envoyée reste tracée. */
  async supprimer({ id }: { id: string }): Promise<void> {
    const actuelle = await this.trouver({ id });
    if (actuelle.statut !== 'brouillon') {
      throw new ConflictException(
        `La décision ${id} est « ${actuelle.statut} » : seul un brouillon peut être supprimé`,
      );
    }
    await this.prisma.decision.delete({ where: { id } });
  }

  /** Champs du prévu transmis → colonnes (un champ absent reste inchangé). */
  private static colonnesPrevu({
    prevu,
  }: {
    prevu: Partial<VoletPrevu>;
  }): Prisma.DecisionUpdateInput {
    return {
      prevuProduit: prevu.produit,
      prevuDose: prevu.dose,
      prevuUniteDose: prevu.uniteDose,
      prevuDate: prevu.date,
      prevuCoutEstime: prevu.coutEstime,
    };
  }

  /** Saisie du réel → colonnes. La photo est décodée et son format vérifié. */
  private static colonnesReel({ reel }: { reel: SaisieReel }): Prisma.DecisionUpdateInput {
    const { photo } = reel;
    let colonnesPhoto: Prisma.DecisionUpdateInput = {};
    if (photo === null) {
      colonnesPhoto = { reelPhoto: null, reelPhotoType: null };
    } else if (photo !== undefined) {
      const octets = Buffer.from(photo.base64, 'base64');
      if (octets.length === 0 || octets.length > TAILLE_MAX_PHOTO_OCTETS) {
        throw new BadRequestException('Photo vide ou trop lourde (2 Mo maximum)');
      }
      if (!SIGNATURES_PHOTO[photo.type](octets)) {
        throw new BadRequestException(`Le contenu de la photo n'est pas au format ${photo.type}`);
      }
      colonnesPhoto = { reelPhoto: new Uint8Array(octets), reelPhotoType: photo.type };
    }
    return {
      reelProduit: reel.produit,
      reelDose: reel.dose,
      reelUniteDose: reel.uniteDose,
      reelDate: reel.date,
      reelCout: reel.cout,
      ...colonnesPhoto,
    };
  }

  private async chargerExecution({ id }: { id: string }): Promise<ExecutionWorkflow> {
    const ligne = await this.prisma.executionWorkflow.findUnique({
      where: { id },
      include: INCLURE_ETATS_NOEUDS,
    });
    if (!ligne) {
      throw introuvable({ entite: 'Exécution', id });
    }
    return versExecutionWorkflow({ ligne });
  }

  /** Traçabilité : chaque nœud cité doit exister dans le snapshot de l'exécution. */
  private verifierNoeuds({ execution, noeudIds }: VerifierNoeudsParams): void {
    const connus = new Set(execution.snapshot.noeuds.map((noeud) => noeud.id));
    const inconnus = noeudIds.filter((noeudId) => !connus.has(noeudId));
    if (inconnus.length > 0) {
      throw new BadRequestException(
        `Nœuds absents du snapshot de l'exécution ${execution.id} : ${inconnus.join(', ')}`,
      );
    }
  }
}
