import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { auditLog } from '../db/schema';
import type { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class AuditLogService {
  constructor(private readonly drizzle: DrizzleService) {}

  async record(
    actor: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.drizzle.db.insert(auditLog).values({
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

  listAll(limit = 100) {
    return this.drizzle.db.query.auditLog.findMany({
      orderBy: desc(auditLog.createdAt),
      limit,
    });
  }
}
