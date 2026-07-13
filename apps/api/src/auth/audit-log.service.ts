import { Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { auditLog } from '../db/schema';
import type { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class AuditLogService {
  constructor(private readonly drizzle: DrizzleService) {}

  // Optional trailing `db` lets a controller pass its own transaction so the
  // audit-log insert and the primary write commit or roll back together
  // (GC-061) — defaults to the plain connection for callers that don't care.
  async record(
    actor: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    db: DbOrTx = this.drizzle.db,
  ) {
    await db.insert(auditLog).values({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      metadata,
    });
  }

  listForEntity(entityType: string, entityId: string) {
    return this.drizzle.db.query.auditLog.findMany({
      where: (log, { and }) => and(eq(log.entityType, entityType), eq(log.entityId, entityId)),
      orderBy: desc(auditLog.createdAt),
    });
  }

  async listAll(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, [{ count }]] = await Promise.all([
      this.drizzle.db.query.auditLog.findMany({ orderBy: desc(auditLog.createdAt), limit, offset }),
      this.drizzle.db.select({ count: sql<number>`count(*)::int` }).from(auditLog),
    ]);
    return { data, total: count, page, limit };
  }
}
