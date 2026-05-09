# Bubble Masters: The Next Level

Suika / Watermelon-style drop-and-merge physics game with a football / World Cup theme, plus three additional themed "worlds." See [`artifacts/fruit-clash/GAME_DOCUMENTATION.md`](./artifacts/fruit-clash/GAME_DOCUMENTATION.md) for the full gameplay and architecture reference.

> **Status — May 2026:** This repo is being repurposed as **Goal Smash** (working title), an Angry-Birds-style landscape physics-destruction football game. The integration layer (ads, IAP, leaderboards, EAS pipeline, custom Expo modules) is reused; the merge gameplay is being replaced. See [`REBRANDING.md`](./REBRANDING.md) for the identity-swap checklist. Until the rebrand lands, the workspace name (`fruit-clash`) and product name (`Bubble Masters`) below remain accurate.

## Workspace layout

pnpm workspace monorepo. Each package manages its own dependencies.

```
artifacts/
├── api-server/       # Express 5 API (deployed to Railway)
├── fruit-clash/      # Expo mobile app (built via EAS)
└── mockup-sandbox/   # Vite UI mockup playground (deployed to Vercel)

lib/
├── api-client-react/ # Generated react-query client (from OpenAPI)
├── api-spec/         # OpenAPI spec + Orval codegen
├── api-zod/          # Generated Zod schemas
└── db/               # Drizzle ORM + PostgreSQL schema

scripts/              # Workspace scripts package
```

## Tech stack

- **Language**: TypeScript 5.9 (strict)
- **Package manager**: pnpm workspaces, Node 24
- **Mobile**: Expo (React Native) + expo-router, distributed via EAS
- **API**: Express 5 + Pino + Zod
- **Database**: PostgreSQL + Drizzle ORM (managed on Railway)
- **Mockup**: Vite + React + Tailwind (deployed to Vercel)
- **API codegen**: Orval (OpenAPI → react-query hooks + Zod schemas)

## Prerequisites

- Node.js 24
- pnpm 9+
- For mobile: Expo account + EAS CLI (`npm i -g eas-cli`)

## Local setup

```bash
pnpm install
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp lib/db/.env.example lib/db/.env
# Fill in DATABASE_URL pointing at your local or Railway Postgres
```

## Common commands

```bash
pnpm run typecheck                                    # typecheck all packages
pnpm run build                                        # typecheck + build all packages
pnpm --filter @workspace/api-server run dev           # run API server locally
pnpm --filter @workspace/fruit-clash run dev          # run Expo app locally
pnpm --filter @workspace/mockup-sandbox run dev       # run mockup sandbox
pnpm --filter @workspace/db run push                  # push Drizzle schema changes
pnpm --filter @workspace/api-spec run codegen         # regenerate API client from OpenAPI
```

## Deployment

| Target | Provider | Trigger |
|--------|----------|---------|
| API + DB | Railway | Push to `main` (Railway GitHub integration) |
| Mobile app | EAS Build + EAS Update | Manual / tag via GitHub Actions |
| Mockup sandbox | Vercel | Push to `main` (Vercel GitHub integration) |

Environment variables for each deployment live in the provider's dashboard. See each package's `.env.example` for the keys it expects.
