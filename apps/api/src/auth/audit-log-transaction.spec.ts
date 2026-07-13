import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { AuditLogService } from './audit-log.service';
import { TagsService } from '../tags/tags.service';
import { DrizzleService } from '../db/drizzle.service';
import { tags } from '../db/schema';
import type { AuthenticatedUser } from './current-user.decorator';

// GC-061 — proves the actual bug found while live-testing: a write +
// audit-log record wrapped in one db.transaction() roll back together.
// Uses a bogus actor id (no matching `users` row) to force the exact
// failure mode that surfaced this ticket (a stale JWT referencing a
// deleted user tripping audit_log_actor_id_users_id_fk).
describe('write + audit-log in one transaction (integration, real DB) — GC-061', () => {
  let auditLog: AuditLogService;
  let tagsService: TagsService;
  let drizzle: DrizzleService;
  const tagName = `gc061-rollback-test-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] })],
      providers: [AuditLogService, TagsService, DrizzleService, EventEmitter2],
    }).compile();

    auditLog = moduleRef.get(AuditLogService);
    tagsService = moduleRef.get(TagsService);
    drizzle = moduleRef.get(DrizzleService);
  });

  it('rolls back the tag insert when the audit-log insert fails', async () => {
    const bogusActor: AuthenticatedUser = { id: '00000000-0000-0000-0000-000000000000', email: 'ghost@example.com', role: 'owner' };

    await expect(
      drizzle.db.transaction(async (tx) => {
        const created = await tagsService.create({ name: tagName }, tx);
        // bogusActor.id has no matching `users` row — trips the FK and
        // should roll back the tag insert above along with it.
        await auditLog.record(bogusActor, 'tag.create', 'tag', created.id, { name: created.name }, tx);
        return created;
      }),
    ).rejects.toThrow();

    const found = await drizzle.db.query.tags.findFirst({ where: eq(tags.name, tagName) });
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    // Belt-and-suspenders cleanup in case the rollback assertion above ever
    // regresses — don't leave a stray tag behind either way.
    await drizzle.db.delete(tags).where(eq(tags.name, tagName));
  });
});
