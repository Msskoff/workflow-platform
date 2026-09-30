import { CLASSES_CHAMP } from '@/components/parametres/etiquette-champ';

interface ChampNombreOptionnelProps {
  libelle: string;
  valeur: string;
  surChangement: (params: { valeur: string }) => void;
  /** Texte affiché après le champ (unité). */
  suffixe?: string;
  pas?: number;
}

/** Nombre positif facultatif, saisi comme texte (vide = non renseigné). */
export function ChampNombreOptionnel({
  libelle,
  valeur,
  surChangement,
  suffixe,
  pas = 0.01,
}: ChampNombreOptionnelProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-700">{libelle}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={pas}
          inputMode="decimal"
          value={valeur}
          onChange={(evenement) => surChangement({ valeur: evenement.target.value })}
          className={CLASSES_CHAMP}
        />
        {suffixe && <span className="text-xs text-neutral-500">{suffixe}</span>}
      </span>
    </label>
  );
}

/** Texte d'un champ numérique → nombre, ou `null` si vide ou invalide. */
export function lireNombre({ texte }: { texte: string }): number | null {
  if (texte.trim() === '') {
    return null;
  }
  const nombre = Number(texte.replace(',', '.'));
  return Number.isFinite(nombre) && nombre >= 0 ? nombre : null;
}

/** Nombre ou `null` → texte de champ. */
export function versTexte({ nombre }: { nombre: number | null }): string {
  return nombre === null ? '' : String(nombre);
}
