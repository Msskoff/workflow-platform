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
| Nombre / Seuil       | `factice.*`                        | Nœuds de démonstration du moteur                                               |

- **Indicateurs** : les nœuds d'analyse publient une sortie `indicateurs` (clés du catalogue
  `packages/shared/src/domaine/indicateurs.ts`). L'entrée du nœud Règles métier est `multiple` : elle
  accepte plusieurs connexions et reçoit un tableau.
- **Décisions** : à la fin d'une exécution réussie, chaque règle déclenchée devient une `Decision` en
  brouillon : explication (le « pourquoi »), recommandation, priorité, `donnees` (indicateur, valeur,
  condition, nœud source) et `noeudIds` (chaîne des nœuds qui l'ont produite).

Jeu de données d'exemple (tests et essais dans l'éditeur) : `apps/api/exemples/` (trace CSV, points
GeoJSON, contour, contour auto-intersecté, formulaires complet et incomplet, image Sentinel-2
synthétique `sentinel2-parcelle.tif`, régénérable par `node scripts/generer-image-exemple.mjs` depuis `apps/api`).

## Revue des décisions

- Cycle : `brouillon → validé → envoyé`, ou `brouillon → rejeté` (avec un motif interne facultatif).
  Pas de retour en arrière ; l'explication n'est modifiable qu'en brouillon.
- Écran interne `/revue` : décisions par statut et par client, avec le « pourquoi », la mesure et la
  condition qui l'ont motivée, la chaîne des nœuds, et les actions valider, rejeter, modifier
  l'explication et envoyer (avec confirmation).
- Espace client : `GET /espace-client/clients/:clientId/decisions` ne renvoie **que** les décisions
  `envoyé`, sans données internes (nœuds, motif de rejet, historique).

## Modèles de workflow

- `GET/POST /modeles`, `GET/PATCH/DELETE /modeles/:id`. Un modèle doit être structurellement
  exécutable (types, ports, cycles, entrées obligatoires, paramètres).
- Modèles prédéfinis déclarés dans `apps/api/src/modeles/modeles-predefinis.ts`, synchronisés au
  démarrage de l'API et non modifiables : **Diagnostic initial parcelle** (import GPS → reprojection
  → contrôle qualité → surface → NDVI → zonage → règles → devis).
- Éditeur : la colonne de gauche liste les modèles, un clic charge le graphe. « Enregistrer comme
  modèle » garde nœuds, réglages et connexions, mais jamais les fichiers chargés (GPS, image,
  photos).

## Conventions

Voir [CLAUDE.md](CLAUDE.md). ESLint impose les paramètres nommés (`no-restricted-syntax`) : toute
fonction, méthode ou fonction fléchée nommée reçoit au plus un argument objet. Les callbacks imposés
par une API (`reduce`, `forEach`…) et les contrôleurs Nest (paramètres injectés par décorateur) sont exemptés.
