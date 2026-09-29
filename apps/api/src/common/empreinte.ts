import { createHash } from 'node:crypto';

/** Sérialisation JSON à clés triées : deux objets égaux donnent la même chaîne. */
function serialiserCanonique(valeur: unknown): string {
  if (Array.isArray(valeur)) {
    return `[${valeur.map((element) => serialiserCanonique(element)).join(',')}]`;
  }
  if (valeur !== null && typeof valeur === 'object') {
    const entrees = Object.entries(valeur)
      .filter(([, contenu]) => contenu !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([cle, contenu]) => `${JSON.stringify(cle)}:${serialiserCanonique(contenu)}`);
    return `{${entrees.join(',')}}`;
  }
  return JSON.stringify(valeur);
}

interface CalculerEmpreinteParams {
  valeur: unknown;
}

/** SHA-256 (hexadécimal) de la sérialisation canonique d'une valeur JSON. */
export function calculerEmpreinte({ valeur }: CalculerEmpreinteParams): string {
  return createHash('sha256').update(serialiserCanonique(valeur)).digest('hex');
}
