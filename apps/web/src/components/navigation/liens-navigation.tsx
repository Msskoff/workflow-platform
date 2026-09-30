import Link from 'next/link';

const LIENS = [
  { href: '/editeur', libelle: 'Éditeur de workflow' },
  { href: '/revue', libelle: 'Revue des décisions' },
  { href: '/suivi', libelle: 'Suivi de campagne' },
  { href: '/clients', libelle: 'Clients' },
] as const;

interface LiensNavigationProps {
  /** Chemin de la page courante, mis en évidence. */
  actif: (typeof LIENS)[number]['href'];
}

/** Navigation entre les écrans internes. */
export function LiensNavigation({ actif }: LiensNavigationProps) {
  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Navigation interne">
      {LIENS.map((lien) => (
        <Link
          key={lien.href}
          href={lien.href}
          aria-current={lien.href === actif ? 'page' : undefined}
          className={`rounded px-2 py-1 ${lien.href === actif ? 'bg-neutral-900 font-semibold text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          {lien.libelle}
        </Link>
      ))}
    </nav>
  );
}
