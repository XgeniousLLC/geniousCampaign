# Build context must be the repo root — see docker-compose.yml.
# VITE_API_BASE_URL is baked in at build time (Vite inlines import.meta.env.*
# at build, not runtime) — pass it as a build arg, rebuild if it changes.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace packages/shared && npm run build --workspace apps/web

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
