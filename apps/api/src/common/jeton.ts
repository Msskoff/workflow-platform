import { createHash, randomBytes } from 'node:crypto';

/** Jeton d'accès aléatoire (256 bits), utilisable tel quel dans une URL. */
export function genererJeton(): string {
  return randomBytes(32).toString('base64url');
}

/** Empreinte stockée en base : un jeton volé dans la base ne donne pas accès à l'espace. */
export function empreinteJeton({ jeton }: { jeton: string }): string {
  return createHash('sha256').update(jeton.trim()).digest('hex');
}
