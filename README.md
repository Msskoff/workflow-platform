# workflow-platform

Éditeur de workflows exécutables (type n8n) pour une entreprise d'agriculture de précision. Outil interne, en phase MVP.

| Workspace         | Rôle                                        | Port |
| ----------------- | ------------------------------------------- | ---- |
| `apps/web`        | Éditeur Next.js (App Router, Tailwind)      | 3000 |
| `apps/api`        | API Nest.js + Prisma (SQLite)               | 3001 |
| `packages/shared` | Types et schémas Zod partagés front et back | —    |

## Prérequis

Node.js ≥ 22.12 et npm ≥ 10.

## Démarrage

```bash
npm install            # génère aussi le client Prisma (postinstall)
cp .env.example .env   # optionnel : les valeurs par défaut conviennent en local
npm run db:migrate     # crée/met à jour la base SQLite apps/api/prisma/dev.db
npm run db:seed        # cultures d'exemple (maïs, manioc, cacao), à valider par un agronome
npm run dev            # build shared, puis shared (watch) + api + web en parallèle
```

- Web : <http://localhost:3000> (statut de l'API et de la base), éditeur `/editeur`, revue `/revue`
- API : <http://localhost:3001/health>

> Après `npm run db:migrate` ou `npm run db:generate`, **relancez `npm run dev`** : le watcher
> de l'API ne voit pas toujours la régénération du client Prisma et peut tourner avec un
> client périmé (erreurs du type « Cannot read properties of undefined (reading 'findMany') »).

## Scripts racine

| Commande              | Effet                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`         | Lance shared (watch), api et web                                             |
| `npm run build`       | Build shared → api → web                                                     |
| `npm run lint`        | ESLint sur tous les workspaces                                               |
| `npm run test`        | Tests Jest (shared, api)                                                     |
| `npm run typecheck`   | Vérification TypeScript de tous les workspaces                               |
| `npm run format`      | Formatage Prettier                                                           |
| `npm run db:migrate`  | Crée une migration à partir de `apps/api/prisma/schema.prisma` et l'applique |
| `npm run db:generate` | Régénère le client Prisma                                                    |
| `npm run db:studio`   | Ouvre Prisma Studio (navigateur de données)                                  |
| `npm run db:seed`     | Cultures d'exemple (idempotent, n'écrase jamais une culture existante)       |

## Modèle métier (API)

`Client → Parcelle → Campagne → ExecutionWorkflow → Decision`, plus les `DonneeBrute` d'une campagne.
Types et schémas Zod dans `packages/shared/src/domaine`, modèles Prisma dans `apps/api/prisma/schema.prisma`.

| Route             | Opérations                  | Règles clés                                                                  |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `/clients`        | CRUD, filtre `?nom=`        | Suppression refusée (409) si le client a des parcelles                       |
| `/parcelles`      | CRUD, filtre `?clientId=`   | Géométrie GeoJSON (Polygon/MultiPolygon), `surfaceHa` calculée par l'API     |
| `/campagnes`      | CRUD, filtre `?parcelleId=` | Date de fin ≥ date de début                                                  |
| `/donnees-brutes` | Import + lecture uniquement | Immuables (triggers SQLite), empreinte SHA-256 du contenu                    |
| `/executions`     | CRUD, filtres               | `version` incrémentée par campagne et workflow, snapshot figé (trigger)      |
| `/decisions`      | CRUD, filtres               | Nœuds vérifiés dans le snapshot ; `brouillon → validé → envoyé`, sans retour |
| `/noeuds`         | Lecture                     | Catalogue des types de nœuds (ports, JSON Schema des paramètres)             |

Toutes les suppressions sont en `Restrict` : on ne supprime jamais un parent qui a des enfants.

## Nœuds et moteur d'exécution

- **Contrat** : `NodeDefinition` (`packages/shared/src/noeuds/node-definition.ts`) : `id`, `categorie`
  (`collecte | standardisation | analyse | decision | restitution`), ports d'`entrees` et de `sorties`
  typés (`packages/shared/src/noeuds/types-donnees.ts`), schéma Zod des `parametres`, et
  `run({ inputs, params, context })`.
- **Ajouter un nœud** : créer `apps/api/src/noeuds/definitions/<nom>.noeud.ts` avec `defineNode({...})`,
  puis l'ajouter à la liste de `definitions/index.ts`. Le moteur ne change pas, et l'éditeur le reçoit
  via `GET /noeuds`.
- **Validation** : `validerWorkflow` (partagé) vérifie les ports, la compatibilité des types, les entrées
  obligatoires et l'absence de cycle. L'éditeur l'utilise pour refuser une connexion, et le serveur
  pour refuser une exécution (400). Le serveur valide en plus les paramètres.
- **Exécution** : `POST /executions` (snapshot du graphe), puis `POST /executions/:id/lancer`. Le moteur
  trie les nœuds topologiquement, les exécute dans l'ordre et enregistre le statut de chaque nœud
  (`en_attente | en_cours | ok | erreur`), lu par l'éditeur via `GET /executions/:id`.
- **Éditeur** : <http://localhost:3000/editeur>. Un clic sur un nœud ouvre le panneau latéral de ses
  paramètres (formulaire généré depuis le schéma Zod du nœud) et le résultat de sa dernière exécution.

| Nœud                 | Id                                 | Rôle                                                                           |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| Import GPS           | `collecte.import_gps`              | GeoJSON (points, trace, polygone) ou CSV de points → contour de parcelle       |
| Formulaire terrain   | `collecte.formulaire_terrain`      | Culture, sol, irrigation, historique, photos (métadonnées uniquement)          |
| Reprojection         | `standardisation.reprojection`     | Vers Lambert-93, UTM 30/31/32N, LAEA Europe, Web Mercator ou WGS 84 (proj4)    |
| Contrôle qualité     | `standardisation.controle_qualite` | Géométrie invalide, données manquantes → rapport (erreurs, avertissements)     |
| Surface et périmètre | `analyse.surface_perimetre`        | Surface (ha), périmètre (m), indice de compacité                               |
| NDVI                 | `analyse.ndvi`                     | GeoTIFF rouge + PIR (ex. Sentinel-2 B04/B08) → NDVI par pixel, masqué parcelle |
| Zonage               | `analyse.zonage`                   | N zones de NDVI homogène (k-means ou quantiles) + statistiques par zone        |
| Règles métier        | `decision.regles_metier`           | Si indicateur ⋚ seuil → décision (recommandation + explication + motif)        |
| Devis                | `restitution.devis`                | Surface × tarif/ha par service, frais fixes, TVA (indicatif, pas de facture)   |
| Rapport PDF          | `restitution.rapport_pdf`          | Fige carte, zones, indicateurs et devis ; PDF généré à la demande              |
| Nombre / Seuil       | `factice.*`                        | Nœuds de démonstration du moteur                                               |

- **Indicateurs** : les nœuds d'analyse publient une sortie `indicateurs` (clés du catalogue
  `packages/shared/src/domaine/indicateurs.ts`). L'entrée du nœud Règles métier est `multiple` : elle
  accepte plusieurs connexions et reçoit un tableau.
- **Décisions** : à la fin d'une exécution réussie, chaque règle déclenchée devient une `Decision` en
  brouillon : explication (le « pourquoi »), recommandation, priorité, `donnees` (indicateur, valeur,
  condition, nœud source) et `noeudIds` (chaîne des nœuds qui l'ont produite).

Jeu de données d'exemple (tests et essais dans l'éditeur) : `apps/api/exemples/` (trace CSV, points
GeoJSON, contour, contour auto-intersecté, formulaires complet et incomplet, image Sentinel-2
synthétiques `sentinel2-parcelle.tif` et `sentinel2-parcelle-juin.tif` (seconde date, pour la
comparaison), régénérables par `node scripts/generer-image-exemple.mjs` depuis `apps/api`).

## Revue des décisions

- Cycle complet d'une recommandation : `brouillon → validé → envoyé → appliqué | non_appliqué`, ou
  `brouillon → rejeté` (motif interne facultatif). `non_appliqué` exige un motif. Deux corrections
  de terrain seulement : `non_appliqué → appliqué` (appliquée plus tard) et `appliqué → envoyé`
  (case « fait » décochée, refusé une fois le réel saisi). L'explication n'est modifiable qu'en
  brouillon, le **prévu** (produit, dose, unité, date, coût estimé) jusqu'à l'envoi.
- Écran interne `/revue` : décisions par statut et par client, avec le « pourquoi », la mesure et la
  condition qui l'ont motivée, la chaîne des nœuds, et les actions valider, rejeter, modifier
  l'explication, saisir le prévu et envoyer (avec confirmation).
- Chaque carte de décision propose l'**aperçu du rapport PDF** de son exécution
  (`GET /executions/:id/rapport.pdf` : décisions validées et envoyées, bandeau « Aperçu interne »).

## Suivi de campagne

- Écran interne `/suivi` : chaque campagne (client · parcelle) avec son taux d'application, puis
  `/suivi/:campagneId` : **reste à faire**, **appliqué**, **non appliqué**, prévu et réel côte à côte.
- Actions : saisir l'application (volet **réel** : produit, dose, date, coût, photo facultative
  réduite dans le navigateur à 1280 px en JPEG), déclarer non appliquée avec un motif, corriger le
  réel, annuler une application sans réel.
- Indicateurs (fonction partagée `calculerIndicateursSuivi`) : taux d'application (appliquées /
  conseillées), écart de coût prévu/réel (sommes sur les décisions ayant les deux), écart de dose moyen
  (à unité identique).
- API : `GET /suivi/campagnes`, `GET /suivi/campagnes/:id`, `PATCH /decisions/:id` (prévu, réel,
  statut), `GET /decisions/:id/photo`.

## Rapport PDF et espace client

- **Rapport PDF** : le nœud `restitution.rapport_pdf` fige, à l'exécution, la carte (contour et zones
  dans un même système métrique), les indicateurs et le devis. Le PDF (`apps/api/src/rapports/`,
  pdfkit + Poppins) est produit à la demande avec les 3 à 5 décisions les plus prioritaires : en
  français simple, carte colorée, « Pourquoi ? » de chaque recommandation, actions à suivre, devis.
- **Accès client** : page interne `/clients` (créer client, parcelle depuis un contour GeoJSON,
  campagne) puis « Générer le lien d'accès » (`POST /clients/:id/acces`). Le lien contient un jeton
  aléatoire de 256 bits, affiché une seule fois ; seule son empreinte SHA-256 est stockée. Régénérer
  le lien révoque l'ancien. Pas de compte ni de mot de passe.
- **Espace client** (`/espace`, séparé de l'éditeur, en lecture seule, non indexé, sans referrer) :
  saisie du code ou du lien, liste des parcelles, puis par parcelle : carte des zones colorées et
  légende, chiffres clés, recommandations avec leur « pourquoi », actions à suivre, comparaison de deux
  analyses, chronologie de la saison et téléchargement du PDF.
- Le client ne voit que les analyses **publiées** (exécution terminée avec un rapport et au moins une
  décision envoyée) et, dans celles-ci, uniquement les décisions `envoyé`, `appliqué` ou
  `non_appliqué` (sans motifs ni coûts).
- **Case « fait »** : seule écriture de l'espace client. Le fermier ou l'agent terrain coche une
  action une fois faite (`POST /espace-client/:jeton/decisions/:id/fait`) ; l'équipe la voit dans le
  suivi et complète le réel. Une fois le réel saisi par l'équipe, la case est verrouillée.
- API : `GET /espace-client/:jeton`, `GET /espace-client/:jeton/parcelles/:id`,
  `GET /espace-client/:jeton/parcelles/:id/rapport.pdf?analyse=` (jeton inconnu ou révoqué : 404).

## Modèles de workflow

- `GET/POST /modeles`, `GET/PATCH/DELETE /modeles/:id`. Un modèle doit être structurellement
  exécutable (types, ports, cycles, entrées obligatoires, paramètres).
- Modèles prédéfinis déclarés dans `apps/api/src/modeles/modeles-predefinis.ts`, synchronisés au
  démarrage de l'API et non modifiables : **Diagnostic initial parcelle** (import GPS → reprojection
  → contrôle qualité → surface → NDVI → zonage → règles → devis → rapport PDF), et ses déclinaisons
  **Diagnostic maïs / manioc / cacao** rattachées à leur culture.
- Éditeur : la colonne de gauche liste les modèles, un clic charge le graphe. « Enregistrer comme
  modèle » garde nœuds, réglages et connexions, mais jamais les fichiers chargés (GPS, image,
  photos).

## Cultures et calendrier prévisionnel

- Entité `Culture` (`/cultures`) : nom, cycle en jours, stades phénologiques (durée) et leurs
  interventions types (fertilisation, traitement, analyse satellite, observation, entretien, récolte).
  La somme des durées des stades doit égaler le cycle.
- Un modèle de workflow peut être rattaché à une culture et exposer des **paramètres par défaut**
  (`parametresDefaut`) : seuils NDVI des règles, doses de référence des interventions, tarifs du devis.
  Ils sont appliqués au graphe (`appliquerParametresCulture`, package partagé).
- Création d'une campagne (`/clients`) : choisir la culture affiche les modèles proposés et le
  **calendrier prévisionnel** (stades datés, interventions et doses de référence). Sur une campagne
  existante, « voir le plan » permet d'ouvrir un modèle proposé dans l'éditeur, campagne présélectionnée.
- API : `GET/POST /cultures`, `GET/PATCH /cultures/:id`, `GET /cultures/:id/proposition?dateDebut=`,
  `GET /campagnes/:id/plan`, `GET /modeles?cultureId=`.
- ⚠️ **Données d'exemple** (`apps/api/src/cultures/cultures-exemple.ts`, `npm run db:seed`) : cycles,
  stades, doses, seuils et tarifs plausibles pour l'Afrique de l'Ouest mais **non validés** ; tout est
  marqué `aValider` et signalé dans l'interface. À faire valider par un agronome.

## Conventions

Voir [CLAUDE.md](CLAUDE.md). ESLint impose les paramètres nommés (`no-restricted-syntax`) : toute
fonction, méthode ou fonction fléchée nommée reçoit au plus un argument objet. Les callbacks imposés
par une API (`reduce`, `forEach`…) et les contrôleurs Nest (paramètres injectés par décorateur) sont exemptés.
