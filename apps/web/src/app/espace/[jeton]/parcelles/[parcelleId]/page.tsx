import { apiRoutes, rangPriorite, vueParcelleClientSchema } from '@workflow/shared';
import { CarteParcelle } from '@/components/cartographie/carte-parcelle';
import { LegendeZones } from '@/components/cartographie/legende-zones';
import { AccesRefuse } from '@/components/espace-client/acces-refuse';
import { ActionsASuivre } from '@/components/espace-client/actions-a-suivre';
import { BoutonTelechargerRapport } from '@/components/espace-client/bouton-telecharger-rapport';
import { ChiffresCles } from '@/components/espace-client/chiffres-cles';
import { ChronologieSaison } from '@/components/espace-client/chronologie-saison';
import { ComparaisonAnalyses } from '@/components/espace-client/comparaison-analyses';
import { DecisionsClient } from '@/components/espace-client/decisions-client';
import { EnTeteEspace } from '@/components/espace-client/en-tete-espace';
import { SectionEspace } from '@/components/espace-client/section-espace';
import { lireApiServeur } from '@/lib/api/api-serveur';
import { formaterDate } from '@/lib/espace-client/indicateurs-client';

export const dynamic = 'force-dynamic';

interface ParcelleClientPageProps {
  params: Promise<{ jeton: string; parcelleId: string }>;
  searchParams: Promise<{ analyse?: string | string[] }>;
}

export default async function ParcelleClientPage({
  params,
  searchParams,
}: ParcelleClientPageProps) {
  const { jeton, parcelleId } = await params;
  const { analyse: analyseDemandee } = await searchParams;
  const vue = await lireApiServeur({
    chemin: `${apiRoutes.espaceClient}/${encodeURIComponent(jeton)}/parcelles/${encodeURIComponent(parcelleId)}`,
    schema: vueParcelleClientSchema,
  });
  if (!vue.ok) {
    return <AccesRefuse lienInvalide={vue.statut === 404} />;
  }
  const { client, parcelle, campagnes, analyses, decisions, chronologie } = vue.donnees;

  // Analyse affichée : celle demandée dans l'URL, sinon la plus récente.
  const analyse =
    analyses.find((candidate) => candidate.id === analyseDemandee) ?? analyses[0] ?? null;
  // Mêmes décisions que le rapport PDF : les plus prioritaires, dans la limite fixée (3 à 5).
  const decisionsAnalyse = decisions
    .filter((decision) => decision.analyseId === analyse?.id)
    .sort((a, b) => rangPriorite({ priorite: a.priorite }) - rangPriorite({ priorite: b.priorite }))
    .slice(0, analyse?.rapport.nombreMaxDecisions);
  const hrefAccueil = `/espace/${encodeURIComponent(jeton)}`;
  const hrefParcelle = `${hrefAccueil}/parcelles/${encodeURIComponent(parcelle.id)}`;

  return (
    <>
      <EnTeteEspace
        nomClient={client.nom}
        titre={parcelle.nom}
        retour={{ href: hrefAccueil, libelle: 'Toutes mes parcelles' }}
      />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {!analyse ? (
          <SectionEspace
            titre="Première analyse en préparation"
            description="Votre conseiller finalise l’analyse de cette parcelle. Elle apparaîtra ici dès qu’elle vous sera envoyée."
          >
            <ChronologieSaison
              campagnes={campagnes}
              evenements={chronologie}
              analyseCouranteId={null}
              hrefParcelle={hrefParcelle}
            />
          </SectionEspace>
        ) : (
          <>
            <SectionEspace
              titre="Votre parcelle"
              description={`Analyse du ${formaterDate({ date: analyse.date })}. Les couleurs montrent la vigueur de la végétation : du orange (faible) au vert foncé (forte).`}
              action={
                <BoutonTelechargerRapport
                  jeton={jeton}
                  parcelleId={parcelle.id}
                  analyseId={analyse.id}
                />
              }
            >
              <div className="grid items-start gap-5 md:grid-cols-[3fr_2fr]">
                <CarteParcelle
                  carte={analyse.rapport.carte}
                  titre={`Carte des zones de vigueur de ${parcelle.nom}`}
                />
                <div className="space-y-4">
                  <LegendeZones zonage={analyse.rapport.carte.zonage} />
                  <ChiffresCles
                    surfaceHa={analyse.rapport.surfaceHa}
                    indicateurs={analyse.rapport.indicateurs}
                  />
                </div>
              </div>
            </SectionEspace>

            <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
              <SectionEspace
                titre="Nos recommandations"
                description="Ce que nous vous conseillons, et pourquoi."
              >
                <DecisionsClient decisions={decisionsAnalyse} />
              </SectionEspace>
              <SectionEspace titre="Vos prochaines actions">
                <ActionsASuivre decisions={decisionsAnalyse} />
              </SectionEspace>
            </div>

            <SectionEspace
              titre="Comparer deux dates"
              description="Choisissez deux analyses pour voir comment la parcelle a évolué."
            >
              <ComparaisonAnalyses analyses={analyses} />
            </SectionEspace>

            <SectionEspace titre="La saison en un coup d’œil">
              <ChronologieSaison
                campagnes={campagnes}
                evenements={chronologie}
                analyseCouranteId={analyse.id}
                hrefParcelle={hrefParcelle}
              />
            </SectionEspace>
          </>
        )}
      </main>
    </>
  );
}
