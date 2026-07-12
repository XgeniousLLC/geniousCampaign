import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { EnrollmentService } from './enrollment.service';
import { EnrollActionDto } from './dto/enroll-action.dto';

/**
 * JWT-authenticated equivalent of GC-041's webhook controller — both call
 * EnrollmentService directly and identically (CLAUDE.md invariant 2), so a
 * webhook-triggered pause and an admin-UI-triggered pause are provably the
 * same state transition.
 */
@Controller('admin/sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminEnrollmentController {
  constructor(
    private readonly enrollments: EnrollmentService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post(':id/enroll')
  @Roles('owner', 'editor')
  async enroll(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    const enrollment = await this.enrollments.enroll(id, dto.contactId);
    await this.auditLog.record(user, 'enrollment.enroll', 'sequence', id, { contactId: dto.contactId });
    return enrollment;
  }

  @Post(':id/pause')
  @Roles('owner', 'editor')
  async pause(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId);
    const updated = await this.enrollments.pause(enrollment.id);
    await this.auditLog.record(user, 'enrollment.pause', 'sequence', id, { contactId: dto.contactId });
    return updated;
  }

  @Post(':id/resume')
  @Roles('owner', 'editor')
  async resume(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId);
    const updated = await this.enrollments.resume(enrollment.id);
    await this.auditLog.record(user, 'enrollment.resume', 'sequence', id, { contactId: dto.contactId });
    return updated;
  }

  @Post(':id/stop')
  @Roles('owner', 'editor')
  async stop(@Param('id') id: string, @Body() dto: EnrollActionDto, @CurrentUser() user: AuthenticatedUser) {
    const enrollment = await this.enrollments.findActiveForContactInSequence(id, dto.contactId);
    const updated = await this.enrollments.stop(enrollment.id);
    await this.auditLog.record(user, 'enrollment.stop', 'sequence', id, { contactId: dto.contactId });
    return updated;
  }

  @Get('contacts/:contactId')
  listForContact(@Param('contactId') contactId: string) {
    return this.enrollments.listForContact(contactId);
  }
}
