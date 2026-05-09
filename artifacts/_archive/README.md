# Archive

Past projects and tooling preserved for reference. **None of this
is the active template** — develop against `artifacts/expo-template/`
instead. The pieces here are kept because they're often useful when
wiring a new feature that mirrors something we've shipped before
(IAP grant flows, daily-rewards UI, level loaders, API clients,
codegen pipelines).

## What's here

| Path | What it is |
|---|---|
| `slamgoal-rn/` | Slam Goal — Angry-Birds-style football-physics game built on Expo + planck.js + Skia. Phases 0–5c shipped. The richest reference for the SDK plumbing the template inherits. |
| `slamgoal-unity/` | Slam Goal Unity prototype (Unity 6 LTS / 2D URP / C#). Phase Unity 1–2b. Replaced the RN prototype briefly; the active line went back to Expo, which is why the template is RN. |
| `web/` | Vite + Tailwind marketing site, deployed to Vercel. |
| `api-server/` | Express 5 API deployed to Railway. Health check at `/api/healthz`. Pairs with `root-lib/api-spec` + `root-lib/api-zod` + `root-lib/api-client-react`. |
| `mockup-sandbox/` | Vite UI mockup playground. |
| `root-lib/` | Codegen libs that paired with `api-server`: `api-client-react` (React Query client), `api-spec` (OpenAPI + Orval), `api-zod` (Zod schemas), `db` (Drizzle). |
| `root-scripts/` | One-off generators: `generate-app-icon.mjs` (SVG → PNG), `gen-sfx.py` (FM-synth arcade SFX), `generate-teams-csv.mjs` (Slam Goal characters). |
| `root-app.json`, `root-eas.json` | Empty/legacy root EAS + Expo configs that overlapped with the per-app ones. |
| `Logs-29.04`, `attached_assets/`, `docs/`, `PROGRESS.md`, `REBRANDING.md`, `railway.toml` | Slam Goal / Bubble Masters historical notes, design refs, deployment config. |

## When to look here

- **Wiring a new feature on top of the template.** If the template's
  SDK shells (`lib/ads.ts`, `lib/purchases.ts`, etc.) feel sparse,
  the rich call sites + UI sheets are in `slamgoal-rn/`. Copy
  patterns, not whole files — the template intentionally drops
  game-specific coupling.
- **Spinning up a backend.** `api-server/` + `root-lib/api-*` is a
  worked example of OpenAPI → Orval → React Query, deployed to
  Railway with a Drizzle-on-Postgres data layer.
- **Generating assets.** `root-scripts/generate-app-icon.mjs` and
  `root-scripts/gen-sfx.py` are project-agnostic enough to copy out
  and re-aim.

## Restoring something

Everything here is plain files in git. To bring a piece back into
the active tree:

1. `git mv artifacts/_archive/<thing> artifacts/<thing>`
2. Add it back to `pnpm-workspace.yaml` if it's a workspace package.
3. Re-add any TypeScript project references to the root
   `tsconfig.json` if it's a lib.
4. `pnpm install`.
