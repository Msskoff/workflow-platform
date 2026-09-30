import { apiRoutes, cultureSchema, resumeModeleSchema } from '@workflow/shared';
import { z } from 'zod';
import { FicheCulture } from '@/components/cultures/fiche-culture';
import { LiensNavigation } from '@/components/navigation/liens-navigation';
import { lireApiServeur } from '@/lib/api/api-serveur';

export const dynamic = 'force-dynamic';

export default async function CulturesPage() {
  const [cultures, modeles] = await Promise.all([
    lireApiServeur({ chemin: apiRoutes.cultures, schema: z.array(cultureSchema) }),
    lireApiServeur({ chemin: apiRoutes.modeles, schema: z.array(resumeModeleSchema) }),
  ]);
  const erreur = [cultures, modeles].find((resultat) => !resultat.ok);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Cultures</h1>
          <p className="text-sm text-neutral-600">
            Cycle, stades phénologiques et interventions types de chaque culture, avec les modèles
            de workflow qui lui sont rattachés. Choisie à la création d’une campagne, la culture
            donne les modèles proposés et le calendrier prévisionnel.
          </p>
        </div>
        <LiensNavigation actif="/cultures" />
      </header>
      {!cultures.ok || !modeles.ok ? (
        <p className="text-sm text-red-700">{erreur && !erreur.ok ? erreur.erreur : ''}</p>
      ) : cultures.donnees.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Aucune culture : lancez <code className="font-mono">npm run db:seed</code> pour créer les
          cultures d’exemple (maïs, manioc, cacao).
        </p>
      ) : (
        cultures.donnees.map((culture) => (
          <FicheCulture
            key={culture.id}
            culture={culture}
            modeles={modeles.donnees.filter((modele) => modele.culture?.id === culture.id)}
          />
        ))
      )}
    </main>
  );
}
