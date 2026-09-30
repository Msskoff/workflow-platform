import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Le code d'accès est dans l'URL : pas d'indexation, et jamais transmis aux sites tiers.
export const metadata: Metadata = {
  title: 'Espace client',
  description: 'Suivi de vos parcelles : cartes, recommandations et rapports.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

interface EspaceLayoutProps {
  children: ReactNode;
}

/** Espace client : séparé de l'éditeur interne, sans navigation interne. */
export default function EspaceLayout({ children }: EspaceLayoutProps) {
  return <div className="min-h-screen bg-neutral-100 text-neutral-900">{children}</div>;
}
