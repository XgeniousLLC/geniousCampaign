# Build context must be the repo root (npm workspaces monorepo) — see
# docker-compose.yml's `build.context: .` / `build.dockerfile: apps/api/Dockerfile`.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace packages/shared && npm run build --workspace apps/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages/shared packages/shared
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY apps/api/src/db/migrations apps/api/src/db/migrations
COPY apps/api/drizzle.config.ts apps/api/drizzle.config.ts

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/src/main"]
