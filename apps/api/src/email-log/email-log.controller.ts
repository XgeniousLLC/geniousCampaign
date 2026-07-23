import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { EmailLogService, type EmailLogFilter } from './email-log.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { SettingsService } from '../settings/settings.service';
import { TrackingService } from '../tracking/tracking.service';
import { signUnsubscribeToken } from '../sending/unsubscribe-token.util';

@Controller('email-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailLogController {
  constructor(
    private readonly emailLog: EmailLogService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly auditLog: AuditLogService,
    private readonly settings: SettingsService,
    private readonly tracking: TrackingService,
  ) {}

  @Get()
  list(
    @Query('status') status?: EmailLogFilter['status'],
    @Query('campaignId') campaignId?: string,
    @Query('sequenceId') sequenceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailLog.list({
      status,
      campaignId,
      sequenceId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.emailLog.getDetail(id);
  }

  // GC-132 — resend a failed email from the email log
  @Post(':id/resend')
  @Roles('owner', 'editor')
  async resend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const detail = await this.emailLog.getDetail(id);
    if (detail.send.status !== 'failed') {
      throw new BadRequestException(`Can only resend failed sends; this send has status "${detail.send.status}"`);
    }
    if (!detail.recipientEmail) {
      throw new BadRequestException('Cannot resend: recipient email not found');
    }
    const trackingSecret = this.settings.get('TRACKING_SIGNING_SECRET');
    const unsubscribeUrl = trackingSecret
      ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, detail.recipientEmail)}`
      : '#';
    try {
      await this.sendDispatcher.send({
        to: detail.recipientEmail,
        subject: detail.send.resolvedSubject,
        html: detail.send.resolvedBodyHtml,
        text: detail.send.resolvedBodyText,
        unsubscribeUrl,
      });
      await this.auditLog.record(user, 'email.resend', 'send', id, { to: detail.recipientEmail });
      return { success: true, message: `Email resent to ${detail.recipientEmail}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
