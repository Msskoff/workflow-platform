/** Attend l'échec d'une promesse et renvoie l'erreur ; échoue si la promesse réussit. */
export async function capturerErreur({
  promesse,
}: {
  promesse: Promise<unknown>;
}): Promise<unknown> {
  try {
    await promesse;
  } catch (erreur) {
    return erreur;
  }
  throw new Error("L'opération aurait dû échouer");
}
