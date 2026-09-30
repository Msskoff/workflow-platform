import type { RapportParcelle } from '@workflow/shared';
import { CarteParcelle } from '@/components/cartographie/carte-parcelle';
import { LegendeZones } from '@/components/cartographie/legende-zones';
import { LienApercuRapport } from '@/components/revue/lien-apercu-rapport';

interface VueRapportParcelleProps {
  rapport: RapportParcelle;
  /** Exécution qui a produit le rapport, pour l'aperçu PDF. */
  executionId: string | null;
}

/** Contenu figé du rapport : carte, zones, décisions à revoir, lien d'aperçu PDF. */
export function VueRapportParcelle({ rapport, executionId }: VueRapportParcelleProps) {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-medium">{rapport.titre}</p>
      <CarteParcelle carte={rapport.carte} titre="Carte du rapport" largeur={300} hauteur={200} />
      <LegendeZones zonage={rapport.carte.zonage} />
      <p className="text-neutral-600">
        {rapport.decisionsProposees} décision(s) proposée(s) ; le PDF en reprend jusqu’à{' '}
        {rapport.nombreMaxDecisions} une fois validées dans l’écran de revue.
        {rapport.devis ? ' Devis inclus.' : ''}
      </p>
      {executionId && <LienApercuRapport executionId={executionId} />}
    </div>
  );
}
