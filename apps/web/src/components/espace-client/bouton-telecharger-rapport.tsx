interface BoutonTelechargerRapportProps {
  jeton: string;
  parcelleId: string;
  /** Analyse dont on veut le rapport ; la plus récente si absente. */
  analyseId?: string;
}

/** Téléchargement du rapport PDF (généré à la demande avec les décisions envoyées). */
export function BoutonTelechargerRapport({
  jeton,
  parcelleId,
  analyseId,
}: BoutonTelechargerRapportProps) {
  const requete = analyseId ? `?analyse=${encodeURIComponent(analyseId)}` : '';
  const href = `/api/espace-client/${encodeURIComponent(jeton)}/parcelles/${encodeURIComponent(parcelleId)}/rapport.pdf${requete}`;
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
    >
      <span aria-hidden>↓</span> Télécharger le rapport PDF
    </a>
  );
}
