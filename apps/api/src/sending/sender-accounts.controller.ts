import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { SenderAccountService } from './sender-account.service';
import { GmailOAuthService } from './gmail-oauth.service';
import { CreateSesAccountDto } from './dto/create-ses-account.dto';
import { UpdateSenderAccountDto } from './dto/update-sender-account.dto';

@Controller('sender-accounts')
export class SenderAccountsController {
  constructor(
    private readonly senderAccounts: SenderAccountService,
    private readonly gmailOAuth: GmailOAuthService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
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
