# syntax=docker/dockerfile:1.7
# Build context must be the workspace root (the repo root), not this directory,
# because pnpm needs access to pnpm-workspace.yaml, the lockfile, and sibling
# workspace packages in ../../lib/*. The railway.toml at the repo root wires
# this up automatically via `dockerfilePath`.

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /repo

# Copy workspace manifests and lockfile first so installs can be cached
# independently of source changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc package.json tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/fruit-clash/package.json ./artifacts/fruit-clash/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile --filter "@workspace/api-server..."

# Copy sources for api-server and the libs it depends on.
COPY artifacts/api-server ./artifacts/api-server
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod

RUN pnpm --filter @workspace/api-server run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/artifacts/api-server/dist /app/dist

EXPOSE 3000
CMD ["node", "--enable-source-maps", "/app/dist/index.mjs"]
