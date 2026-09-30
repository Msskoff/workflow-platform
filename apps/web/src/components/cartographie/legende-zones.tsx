import { libelleZone, type Zonage } from '@workflow/shared';
import { couleurZone } from '@/lib/cartographie/couleurs';

interface LegendeZonesProps {
  zonage: Zonage | null;
}

/** Légende des zones de vigueur, en mots simples, avec leur surface. */
export function LegendeZones({ zonage }: LegendeZonesProps) {
  if (!zonage || zonage.zones.length === 0) {
    return null;
  }
  const total = zonage.zones.length;
  // La zone la plus vigoureuse en premier, comme on lit une légende de haut en bas.
  const zones = [...zonage.zones].sort((a, b) => b.numero - a.numero);
  return (
    <ul className="space-y-1.5 text-sm" aria-label="Légende des zones">
      {zones.map((zone) => (
        <li key={zone.numero} className="flex items-center gap-2">
          <span
            className="h-4 w-4 shrink-0 rounded"
            style={{ backgroundColor: couleurZone({ numero: zone.numero, total }) }}
            aria-hidden
          />
          <span className="font-medium">{libelleZone({ numero: zone.numero, total })}</span>
          <span className="ml-auto text-neutral-600">
            {zone.surfaceHa.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha ·{' '}
            {Math.round(zone.partSurface)} %
          </span>
        </li>
      ))}
    </ul>
  );
}
