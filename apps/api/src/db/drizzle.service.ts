import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(configService: ConfigService) {
    this.pool = new Pool({ connectionString: configService.get<string>('DATABASE_URL') });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /**
   * Runs `fn` while holding a Postgres advisory lock on a dedicated
   * connection — used to serialize startup migrations so two boots (watch
   * restarts, multiple replicas) can't run them concurrently and collide on
   * CREATE TABLE / CREATE TYPE.
   */
  async withAdvisoryLock<T>(key: number, fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('select pg_advisory_lock($1)', [key]);
      return await fn();
    } finally {
      await client
        .query('select pg_advisory_unlock($1)', [key])
        .catch(() => undefined);
      client.release();
    }
  }
}
