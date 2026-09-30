import type { VueEspaceClient } from '@workflow/shared';
import Link from 'next/link';
import { formaterDate } from '@/lib/espace-client/indicateurs-client';

interface CarteResumeParcelleProps {
  parcelle: VueEspaceClient['parcelles'][number];
  href: string;
}

/** Vignette d'une parcelle sur l'accueil de l'espace client. */
export function CarteResumeParcelle({ parcelle, href }: CarteResumeParcelleProps) {
  const campagneEnCours = [...parcelle.campagnes].sort((a, b) =>
    b.dateDebut.localeCompare(a.dateDebut),
  )[0];
  return (
    <Link
      href={href}
      className="block space-y-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-600 hover:shadow"
    >
      <h2 className="text-lg font-semibold text-neutral-900">{parcelle.nom}</h2>
      <p className="text-sm text-neutral-600">
        {parcelle.surfaceHa.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha
        {campagneEnCours &&
          ` · ${campagneEnCours.nom}${campagneEnCours.culture ? ` (${campagneEnCours.culture})` : ''}`}
      </p>
      <p className="text-sm">
        {parcelle.derniereAnalyse ? (
          <span className="text-emerald-800">
            Dernière analyse le {formaterDate({ date: parcelle.derniereAnalyse })}
          </span>
        ) : (
          <span className="text-neutral-500">Première analyse en préparation</span>
        )}
      </p>
      <span className="text-sm font-semibold text-emerald-800">Voir la parcelle →</span>
    </Link>
  );
}
