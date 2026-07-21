import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { SenderAccountService } from './sender-account.service';
import { GmailOAuthService } from './gmail-oauth.service';
import { SendDispatcherService } from './send-dispatcher.service';
import { CreateSesAccountDto } from './dto/create-ses-account.dto';
import { UpdateSenderAccountDto } from './dto/update-sender-account.dto';
import { IsEmail, IsString } from 'class-validator';
import { SettingsService } from '../settings/settings.service';
import { TrackingService } from '../tracking/tracking.service';
import { signUnsubscribeToken } from './unsubscribe-token.util';

export class SendTestEmailDto {
  @IsEmail()
  to!: string;
}

@Controller('sender-accounts')
export class SenderAccountsController {
  constructor(
    private readonly senderAccounts: SenderAccountService,
    private readonly gmailOAuth: GmailOAuthService,
    private readonly sendDispatcher: SendDispatcherService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
    private readonly settings: SettingsService,
    private readonly tracking: TrackingService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  list() {
    return this.senderAccounts.listAll();
  }

  // GC-077 — lets an admin add another named AWS SES account (own region/
  // credentials/configuration set), not just the single auto-materialized
  // one driven by the global Settings > Integrations AWS_* values.
  @Post('ses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  async createSesAccount(@Body() dto: CreateSesAccountDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.senderAccounts.createSesAccount(dto);
    await this.auditLog.record(user, 'sender_account.create', 'sender_account', created.id, { email: created.email, provider: 'ses' });
    return created;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateSenderAccountDto, @CurrentUser() user: AuthenticatedUser) {
    const updated = await this.senderAccounts.update(id, dto);
    await this.auditLog.record(user, 'sender_account.update', 'sender_account', id, { fields: Object.keys(dto) });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.senderAccounts.remove(id);
    await this.auditLog.record(user, 'sender_account.delete', 'sender_account', id);
    return result;
  }

  // GC-131 — send a test email from the specified account to verify SMTP/OAuth works
  @Post(':id/send-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  async sendTest(@Param('id') id: string, @Body() dto: SendTestEmailDto, @CurrentUser() user: AuthenticatedUser) {
    const account = await this.senderAccounts.findOne(id);
    const trackingSecret = this.settings.get('TRACKING_SIGNING_SECRET');
    const unsubscribeUrl = trackingSecret
      ? `${this.tracking.baseUrl}/unsubscribe/${signUnsubscribeToken(trackingSecret, dto.to)}`
      : '#';
    try {
      await this.sendDispatcher.send({
        to: dto.to,
        subject: `[Sender test from ${account.displayName || account.email}]`,
        html: `<p>This is a test email from the sender account <strong>${account.displayName || account.email}</strong> (${account.provider.toUpperCase()}).</p>`,
        text: `This is a test email from the sender account ${account.displayName || account.email} (${account.provider.toUpperCase()}).`,
        senderAccountId: id,
        unsubscribeUrl,
      });
      await this.auditLog.record(user, 'sender_account.send_test', 'sender_account', id, { to: dto.to });
      return { success: true, message: `Test email sent to ${dto.to}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }

  @Get('gmail/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'editor')
  connect() {
    return { authUrl: this.gmailOAuth.getConnectUrl() };
  }

  // Public — Google redirects the admin's browser here directly, with no
  // way to attach our JWT. CSRF protection is the signed `state` param
  // generated in connect() above, not JwtAuthGuard.
  @Get('gmail/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const adminAppUrl = this.config.get<string>('ADMIN_APP_URL') || 'http://localhost:5173';
    try {
      const account = await this.gmailOAuth.handleCallback(code, state);
      res.redirect(`${adminAppUrl}/settings/sender-accounts?connected=${encodeURIComponent(account.email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.redirect(`${adminAppUrl}/settings/sender-accounts?error=${encodeURIComponent(message)}`);
    }
  }
}
