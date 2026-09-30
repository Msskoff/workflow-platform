import type { ConstatQualite, RapportQualite } from '@workflow/shared';

const LIBELLES_INDICATEURS: Readonly<Record<string, string>> = {
  surfaceHa: 'Surface (ha)',
  nombrePolygones: 'Polygones',
  nombreSommets: 'Sommets',
  nombrePhotos: 'Photos',
  anneesHistorique: 'Années d’historique',
};

interface ListeConstatsProps {
  titre: string;
  constats: readonly ConstatQualite[];
  classes: string;
}

function ListeConstats({ titre, constats, classes }: ListeConstatsProps) {
  if (constats.length === 0) {
    return null;
  }
  return (
    <div className={`rounded px-2 py-1.5 ${classes}`}>
      <div className="text-xs font-semibold">
        {titre} ({constats.length})
      </div>
      <ul className="mt-1 space-y-1">
        {constats.map((constat, index) => (
          <li key={`${constat.code}-${index}`} className="text-xs" data-code={constat.code}>
            {constat.message}
            {constat.cible && (
              <span className="block font-mono text-[10px] opacity-70">{constat.cible}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface VueRapportQualiteProps {
  rapport: RapportQualite;
}

/** Rapport du contrôle qualité : verdict, erreurs, avertissements et indicateurs. */
export function VueRapportQualite({ rapport }: VueRapportQualiteProps) {
  const indicateurs = Object.entries(rapport.indicateurs);
  return (
    <div className="space-y-2" data-rapport-conforme={rapport.conforme}>
      <div
        className={`rounded px-2 py-1 text-sm font-semibold ${rapport.conforme ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
      >
        {rapport.conforme ? 'Données conformes' : 'Données non conformes'}
      </div>
      <ListeConstats titre="Erreurs" constats={rapport.erreurs} classes="bg-red-50 text-red-800" />
      <ListeConstats
        titre="Avertissements"
        constats={rapport.avertissements}
        classes="bg-amber-50 text-amber-800"
      />
      {indicateurs.length > 0 && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
          {indicateurs.map(([nom, valeur]) => (
            <div key={nom} className="contents">
              <dt className="text-neutral-500">{LIBELLES_INDICATEURS[nom] ?? nom}</dt>
              <dd className="text-right font-mono">{valeur.toLocaleString('fr-FR')}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
