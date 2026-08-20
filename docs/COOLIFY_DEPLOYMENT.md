# Coolify Deployment with Automatic Migrations

This document clarifies the automatic migration setup for Coolify/Nixpacks deployments.

## Automatic Migration on Deploy

Migrations run **automatically** on every deployment through the Start Command. You do **not** need to manually run migrations.

### API Resource Start Command

```bash
npm run db:migrate --workspace apps/api && npm run start:prod --workspace apps/api
```

This command:
1. **First**: Runs `npm run db:migrate` to apply any pending migrations
2. **Then**: Starts the NestJS application with `npm run start:prod`

### Why This Order Matters

- `drizzle-kit migrate` is **idempotent** — it's safe to run every time the app starts
- If migrations haven't been applied yet, they run before the app tries to query the database
- Prevents crash-loops: The app reads `app_settings` table in `onModuleInit()`, so the schema **must** exist before app startup
- On every deploy: Pull code → Build → **Migrations run** → App starts → Ready to serve

## What Happens During Deployment

### Fresh Database (First Deploy)
```
1. Coolify builds the app
2. Coolify starts the container with Start Command
3. drizzle-kit migrate runs → creates all schema tables
4. NestJS app starts → reads app_settings, can initialize properly
5. App is healthy and ready to serve
```

### Existing Database (Subsequent Deploys)
```
1. Coolify builds the app with code changes
2. Coolify starts the container with Start Command
3. drizzle-kit migrate runs → applies new migrations (idempotent, skips existing)
4. NestJS app starts → can access all tables
5. App is healthy with updated schema
```

## Migration Verification

Check the Coolify logs for migration output:
```
🔄 Running migrations...
✓ No pending migrations
✓ Application started
```

Or if there are pending migrations:
```
🔄 Running migrations...
✓ Migration 001_initial_schema applied
✓ Migration 002_webhook_deliveries applied
✓ Application started
```

## No Post-Deployment Script Needed

**Do not** use Coolify's "Post-deployment Command" field to run migrations. Reason:

- Post-deployment commands only run **after** the container is healthy and serving
- If migrations haven't run yet, the app crashes on startup before it's healthy
- The Start Command chain ensures migrations run **before** the app can crash-loop

The Start Command chain is the only reliable place for database setup on a fresh database.

## If You Pull New Migrations

Just push to your branch and trigger a new deployment in Coolify. The migrations will run automatically:

```
git commit -am "feat: Add new email_events tracking"
git push
# → Coolify detects new commit
# → Triggers new build + deploy
# → Migrations run automatically
# → No manual steps needed
```

## Troubleshooting

### App Won't Start / Crash-Loop
Check Coolify logs for:
```
Cannot find table "app_settings"
```

This means migrations didn't run. Verify:
1. Start Command has `npm run db:migrate --workspace apps/api &&` **before** `npm run start:prod`
2. DATABASE_URL is set and points to accessible Postgres
3. Coolify's build container has network access to the database

### Migrations Seem Stuck
`drizzle-kit migrate` is very fast (seconds). If it hangs:
1. Check DATABASE_URL connection string
2. Verify Postgres is accessible from the build/run container
3. Check Postgres logs for connection errors

### Manual Migration Run
If you ever need to manually verify migrations in Coolify:

Use Coolify's **Exec** console:
```bash
npm run db:migrate --workspace apps/api
```

But normally, this is never needed — deployments handle it automatically.

## Reference

- **Drizzle Kit Docs**: https://orm.drizzle.team/kit-docs/overview
- **Coolify Nixpacks**: https://coolify.io/docs/deployment/nixpacks
- **App DEPLOY.md**: See the "Coolify (Nixpacks)" section for full setup
