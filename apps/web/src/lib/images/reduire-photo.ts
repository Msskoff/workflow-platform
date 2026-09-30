import { TAILLE_MAX_PHOTO_OCTETS, type PhotoApplication } from '@workflow/shared';

/** Côté le plus long après réduction : assez pour constater une application au champ. */
const COTE_MAX_PIXELS = 1280;
const QUALITE_JPEG = 0.8;

/**
 * Réduit une photo dans le navigateur (JPEG, 1280 px au plus) avant envoi : quelques centaines
 * de Ko au lieu de plusieurs Mo, pour les connexions faibles. Aucune dépendance : canvas natif.
 */
export async function reduirePhoto({ fichier }: { fichier: File }): Promise<PhotoApplication> {
  if (!fichier.type.startsWith('image/')) {
    throw new Error('Le fichier choisi n’est pas une image.');
  }
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, COTE_MAX_PIXELS / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const contexte = canvas.getContext('2d');
  if (!contexte) {
    throw new Error('Réduction de la photo impossible dans ce navigateur.');
  }
  contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise<Blob | null>((resoudre) =>
    canvas.toBlob(resoudre, 'image/jpeg', QUALITE_JPEG),
  );
  if (!blob || blob.size > TAILLE_MAX_PHOTO_OCTETS) {
    throw new Error('Photo trop lourde, même réduite (2 Mo maximum).');
  }
  const octets = new Uint8Array(await blob.arrayBuffer());
  let binaire = '';
  for (let debut = 0; debut < octets.length; debut += 0x8000) {
    binaire += String.fromCharCode(...octets.subarray(debut, debut + 0x8000));
  }
  return { type: 'image/jpeg', base64: btoa(binaire) };
}
