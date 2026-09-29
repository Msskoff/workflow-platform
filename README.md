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

- Web : <http://localhost:3000> (affiche le statut de l'API et de la base)
- API : <http://localhost:3001/health>

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

Toutes les suppressions sont en `Restrict` : on ne supprime jamais un parent qui a des enfants.

## Conventions

Voir [CLAUDE.md](CLAUDE.md). ESLint impose les paramètres nommés (`no-restricted-syntax`) : toute
fonction, méthode ou fonction fléchée nommée reçoit au plus un argument objet. Les callbacks imposés
par une API (`reduce`, `forEach`…) et les contrôleurs Nest (paramètres injectés par décorateur) sont exemptés.
