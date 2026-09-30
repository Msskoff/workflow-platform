import { FormulaireCodeAcces } from '@/components/espace-client/formulaire-code-acces';

export default function EspaceAccueilPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Votre espace client</h1>
        <p className="text-neutral-600">
          Retrouvez les cartes de vos parcelles, nos recommandations et vos rapports. Saisissez le
          code d’accès transmis par votre conseiller.
        </p>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <FormulaireCodeAcces />
      </div>
    </main>
  );
}
