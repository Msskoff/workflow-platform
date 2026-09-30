import { geometrieParcelleSchema, type GeometrieParcelle } from '@workflow/shared';

export type ResultatContour =
  | { ok: true; geometrie: GeometrieParcelle; nomPropose: string | null }
  | { ok: false; erreur: string };

/** Géométrie et propriétés d'un objet GeoJSON (géométrie seule, Feature ou FeatureCollection). */
function premierPolygone({
  objet,
}: {
  objet: unknown;
}): { geometrie: unknown; proprietes: Record<string, unknown> } | null {
  if (typeof objet !== 'object' || objet === null) {
    return null;
  }
  const { type, geometry, properties, features } = objet as Record<string, unknown>;
  if (type === 'Polygon' || type === 'MultiPolygon') {
    return { geometrie: objet, proprietes: {} };
  }
  if (type === 'Feature') {
    const forme = (geometry as { type?: unknown } | null)?.type;
    return forme === 'Polygon' || forme === 'MultiPolygon'
      ? { geometrie: geometry, proprietes: (properties as Record<string, unknown> | null) ?? {} }
      : null;
  }
  if (type === 'FeatureCollection' && Array.isArray(features)) {
    for (const feature of features) {
      const trouve = premierPolygone({ objet: feature });
      if (trouve) {
        return trouve;
      }
    }
  }
  return null;
}

/**
 * Contour d'une parcelle lu depuis un fichier GeoJSON en WGS84 (longitude, latitude).
 * Le premier polygone trouvé est retenu ; sa propriété `nom` (ou `name`) est proposée comme nom.
 */
export function lireContourGeojson({ texte }: { texte: string }): ResultatContour {
  let objet: unknown;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { ok: false, erreur: 'Le fichier n’est pas un GeoJSON valide (JSON illisible).' };
  }
  const trouve = premierPolygone({ objet });
  if (!trouve) {
    return { ok: false, erreur: 'Aucun polygone trouvé dans le fichier.' };
  }
  const geometrie = geometrieParcelleSchema.safeParse(trouve.geometrie);
  if (!geometrie.success) {
    return {
      ok: false,
      erreur: `Contour invalide : ${geometrie.error.issues[0]?.message ?? 'format inattendu'} (coordonnées attendues en longitude, latitude WGS84).`,
    };
  }
  const nom = trouve.proprietes.nom ?? trouve.proprietes.name;
  return {
    ok: true,
    geometrie: geometrie.data,
    nomPropose: typeof nom === 'string' && nom.trim() !== '' ? nom.trim() : null,
  };
}
