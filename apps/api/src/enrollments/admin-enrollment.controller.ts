import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { EnrollmentService } from './enrollment.service';
import { EnrollActionDto } from './dto/enroll-action.dto';
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
