import { Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { auditLog, users } from '../db/schema';
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
    const [rows, [{ count }]] = await Promise.all([
      this.drizzle.db
        .select({ log: auditLog, actorName: users.name })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset),
      this.drizzle.db.select({ count: sql<number>`count(*)::int` }).from(auditLog),
    ]);
    // actorName falls back to the stored email — actor may have been
    // deleted (actorId set null) or never had a display name set.
    const data = rows.map((r) => ({ ...r.log, actorName: r.actorName || r.log.actorEmail }));
    return { data, total: count, page, limit };
  }
}
