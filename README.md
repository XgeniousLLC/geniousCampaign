# geniusCampaign

In-house email marketing / outreach platform (internal tool).

## Getting this running

This is an npm-workspaces monorepo (`apps/api` NestJS, `apps/web` React/Vite, `packages/shared` shared types) with no Docker — Postgres and Redis run locally. Copy `.env.example` to `.env` and fill in the Sprint 0/1 values, run `npm install` at the repo root, then `npm run dev` to start both apps. See `docs/SPRINT_PLAN.md` and `docs/TICKETS.md` for what's built and what's next, and `CLAUDE.md` for architecture decisions.
