import Link from 'next/link';

interface AccesRefuseProps {
  /** `true` : lien inconnu ou révoqué ; `false` : service momentanément indisponible. */
  lienInvalide: boolean;
}

/** Message affiché quand l'espace client ne peut pas être ouvert. */
export function AccesRefuse({ lienInvalide }: AccesRefuseProps) {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">
        {lienInvalide ? 'Lien d’accès invalide' : 'Espace momentanément indisponible'}
      </h1>
      <p className="text-neutral-600">
        {lienInvalide
          ? 'Ce lien n’est plus valable. Demandez un nouveau lien à votre conseiller, ou saisissez le code qu’il vous a transmis.'
          : 'Merci de réessayer dans quelques minutes.'}
      </p>
      <Link
        href="/espace"
        className="inline-block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
      >
        Saisir un code d’accès
      </Link>
    </main>
  );
}
