import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { raw } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage } from 'http';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AppModule } from './app.module';
import { DrizzleService } from './db/drizzle.service';

// Arbitrary but stable key for the advisory lock guarding startup migrations.
const MIGRATION_LOCK_KEY = 728_113_001;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Apply pending migrations before accepting traffic, so a deploy is just
  // "start the app" — no separate `npm run db:migrate` step. drizzle's
  // migrator is idempotent (tracks applied files in __drizzle_migrations),
  // and the migration folder ships in the image at src/db/migrations.
  const logger = new Logger('Bootstrap');
  const migrationsFolder = resolve(process.cwd(), 'src/db/migrations');
  if (existsSync(migrationsFolder)) {
    const drizzle = app.get(DrizzleService);
    try {
      // Serialize across boots (watch restarts / multiple replicas) with an
      // advisory lock so concurrent CREATE TABLE/TYPE statements can't race.
      await drizzle.withAdvisoryLock(MIGRATION_LOCK_KEY, () =>
        migrate(drizzle.db, { migrationsFolder }),
      );
      logger.log('Database migrations are up to date');
    } catch (err) {
      logger.error(
        `Database migration failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  } else {
    logger.warn(
      `Migrations folder not found at ${migrationsFolder} — skipping migrations`,
    );
  }

  app.enableCors();
  // Designed (email-studio) templates save the block tree plus compiled HTML,
  // which outgrows express's 100kb default once images are inlined.
  app.useBodyParser('json', { limit: '5mb' });
  // AWS SNS posts webhook notifications with Content-Type: text/plain even
  // though the body is JSON. Nest's `rawBody: true` capture only recognizes
  // application/json and application/x-www-form-urlencoded, so req.rawBody
  // was never populated for real SNS requests, crashing SesSnsController
  // before it could parse or log the notification. Capture it explicitly
  // for this route regardless of content-type.
  app.use(
    '/webhooks/ses/sns',
    raw({
      type: '*/*',
      verify: (req: IncomingMessage & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
