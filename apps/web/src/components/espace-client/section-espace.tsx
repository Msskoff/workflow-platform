import type { ReactNode } from 'react';

interface SectionEspaceProps {
  titre: string;
  /** Phrase d'introduction sous le titre. */
  description?: string;
  /** Contenu aligné à droite du titre (bouton, sélecteur…). */
  action?: ReactNode;
  children: ReactNode;
}

/** Bloc de l'espace client : titre, courte explication, contenu. */
export function SectionEspace({ titre, description, action, children }: SectionEspaceProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-neutral-900">{titre}</h2>
          {description && <p className="text-sm text-neutral-600">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
