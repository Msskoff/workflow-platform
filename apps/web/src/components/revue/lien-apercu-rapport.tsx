import { apiRoutes } from '@workflow/shared';

interface LienApercuRapportProps {
  executionId: string;
}

/**
 * Aperçu interne du rapport PDF d'une exécution : décisions validées et envoyées,
 * bandeau « Aperçu interne ». Nécessite un nœud « Rapport PDF » dans le workflow.
 */
export function LienApercuRapport({ executionId }: LienApercuRapportProps) {
  return (
    <a
      href={`/api${apiRoutes.executions}/${encodeURIComponent(executionId)}/rapport.pdf`}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium text-emerald-800 underline"
      title="Décisions validées et envoyées ; disponible si le workflow contient un nœud Rapport PDF"
    >
      Aperçu du rapport PDF
    </a>
  );
}
