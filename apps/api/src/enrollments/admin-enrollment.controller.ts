import { BadRequestException, Body, ConflictException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { EnrollmentService } from './enrollment.service';
import { EnrollActionDto } from './dto/enroll-action.dto';
import { EnrollBulkDto } from './dto/enroll-bulk.dto';
import { ListsService } from '../lists/lists.service';
import { TagsService } from '../tags/tags.service';
import { DrizzleService } from '../db/drizzle.service';

/**
 * JWT-authenticated equivalent of GC-041's webhook controller — both call
 * EnrollmentService directly and identically (CLAUDE.md invariant 2), so a
 * webhook-triggered pause and an admin-UI-triggered pause are provably the
 * same state transition. This controller additionally wraps each call plus
 * its audit-log record in one transaction (GC-061); EnrollmentService's
 * methods are unchanged for the webhook controller, which doesn't pass a
 * transaction and behaves exactly as before.
 */
@Controller('admin/sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminEnrollmentController {
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly lists: ListsService,
    private readonly tags: TagsService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post(':id/enroll')
  @Roles('owner', 'editor')
  enroll(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const enrollment = await this.enrollments.enroll(id, dto.contactId, tx);
      await this.auditLog.record(user, 'enrollment.enroll', 'sequence', id, { contactId: dto.contactId }, tx);
      return enrollment;
    });
  }

  /**
   * Bulk enroll from the sequence page: an explicit contact list, every
   * member of a list, and/or every contact with a tag — combined and
   * deduped. Each contact goes through EnrollmentService.enroll()
   * (invariant 2), so per-contact rules are identical to single enroll;
   * an already-enrolled contact counts as skipped, not a failure, and only
   * genuinely unexpected errors fail. One audit-log row covers the batch.
   */
  @Post(':id/enroll-bulk')
  @Roles('owner', 'editor')
  enrollBulk(@Param('id') id: string, @Body() dto: EnrollBulkDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      await this.enrollments.ensureSequenceEnrollable(id, tx);

      const contactIds = new Set<string>(dto.contactIds ?? []);
      if (dto.listId) {
        const rows = await this.lists.listContacts(dto.listId);
        for (const row of rows) contactIds.add(row.contact.id);
      }
      if (dto.tagId) {
        const rows = await this.tags.listContacts(dto.tagId);
        for (const row of rows) contactIds.add(row.contact.id);
      }
      if (contactIds.size === 0) {
        throw new BadRequestException('Provide contactIds, listId, or tagId selecting at least one contact');
      }

      const result = {
        enrolled: 0,
        skipped: 0,
        failed: 0,
        errors: [] as { contactId: string; reason: string }[],
      };
      for (const contactId of contactIds) {
        try {
          await this.enrollments.enroll(id, contactId, tx);
          result.enrolled++;
        } catch (err) {
          if (err instanceof ConflictException) {
            // Already has an active/paused enrollment — benign, skip.
            result.skipped++;
          } else {
            result.failed++;
            if (result.errors.length < 50) {
              result.errors.push({ contactId, reason: err instanceof Error ? err.message : 'Unknown error' });
            }
          }
        }
      }
      await this.auditLog.record(
        user,
        'enrollment.enroll_bulk',
        'sequence',
        id,
        { enrolled: result.enrolled, skipped: result.skipped, failed: result.failed, listId: dto.listId ?? null, tagId: dto.tagId ?? null },
        tx,
      );
      return result;
    });
  }

  @Post(':id/pause')
  @Roles('owner', 'editor')
  pause(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId, tx);
      const updated = await this.enrollments.pause(enrollment.id, tx);
      await this.auditLog.record(user, 'enrollment.pause', 'sequence', id, { contactId: dto.contactId }, tx);
      return updated;
    });
  }

  @Post(':id/resume')
  @Roles('owner', 'editor')
  resume(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId, tx);
      const updated = await this.enrollments.resume(enrollment.id, tx);
      await this.auditLog.record(user, 'enrollment.resume', 'sequence', id, { contactId: dto.contactId }, tx);
      return updated;
    });
  }

  @Post(':id/stop')
  @Roles('owner', 'editor')
  stop(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId, tx);
      const updated = await this.enrollments.stop(enrollment.id, tx);
      await this.auditLog.record(user, 'enrollment.stop', 'sequence', id, { contactId: dto.contactId }, tx);
      return updated;
    });
  }

  @Get('contacts/:contactId')
  listForContact(@Param('contactId') contactId: string) {
    return this.enrollments.listForContact(contactId);
  }

  @Get(':id/enrollments')
  listForSequence(@Param('id') id: string) {
    return this.enrollments.listForSequence(id);
  }
}
