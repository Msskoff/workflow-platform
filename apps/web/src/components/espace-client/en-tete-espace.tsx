import Link from 'next/link';

interface EnTeteEspaceProps {
  nomClient: string;
  /** Titre de la page (nom de la parcelle, « Vos parcelles »…). */
  titre: string;
  /** Lien de retour vers la liste des parcelles, absent sur l'accueil. */
  retour?: { href: string; libelle: string };
}

/** Bandeau de l'espace client : identité du client, titre de la page, retour. */
export function EnTeteEspace({ nomClient, titre, retour }: EnTeteEspaceProps) {
  return (
    <header className="bg-emerald-800 text-white">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-100">
          <span>Espace client · {nomClient}</span>
          <span className="rounded-full bg-emerald-900/60 px-3 py-0.5 text-xs">
            Consultation seule
          </span>
        </div>
        {retour && (
          <Link href={retour.href} className="inline-block text-sm text-emerald-100 underline">
            ← {retour.libelle}
          </Link>
        )}
        <h1 className="text-2xl font-semibold sm:text-3xl">{titre}</h1>
      </div>
    </header>
  );
}
