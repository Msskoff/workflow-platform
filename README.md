# workflow-platform

Éditeur de workflows exécutables (type n8n) pour une entreprise d'agriculture de précision. Outil interne, en phase MVP.

| Workspace         | Rôle                                   | Port |
| ----------------- | -------------------------------------- | ---- |
| `apps/web`        | Éditeur Next.js (App Router, Tailwind) | 3000 |
| `apps/api`        | API Nest.js                            | 3001 |
| `packages/shared` | Types et schémas Zod partagés          | —    |

## Prérequis

Node.js ≥ 22.12 et npm ≥ 10.

## Démarrage

```bash
npm install
cp .env.example .env   # optionnel : les valeurs par défaut conviennent en local
npm run dev            # build shared, puis shared (watch) + api + web en parallèle
```

- Web : <http://localhost:3000> (affiche le statut de l'API)
- API : <http://localhost:3001/health>

## Scripts racine

| Commande            | Effet                                          |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Lance shared (watch), api et web               |
| `npm run build`     | Build shared → api → web                       |
| `npm run lint`      | ESLint sur tous les workspaces                 |
| `npm run test`      | Tests Jest (shared, api)                       |
| `npm run typecheck` | Vérification TypeScript de tous les workspaces |
| `npm run format`    | Formatage Prettier                             |

## Conventions

Voir [CLAUDE.md](CLAUDE.md). La règle ESLint `max-params: 1` impose les paramètres nommés (un seul argument objet).
