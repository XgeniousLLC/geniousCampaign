import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SenderAccountService } from './sender-account.service';
import { GmailOAuthService } from './gmail-oauth.service';

@Controller('sender-accounts')
export class SenderAccountsController {
  constructor(
    private readonly senderAccounts: SenderAccountService,
    private readonly gmailOAuth: GmailOAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  list() {
    return this.senderAccounts.listAll();
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
