import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SuppressionService } from './suppression.service';
import { SettingsService } from '../settings/settings.service';
import { verifyUnsubscribeToken } from '../sending/unsubscribe-token.util';

@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(
    private readonly suppression: SuppressionService,
    private readonly settings: SettingsService,
  ) {}

  @Get(':token')
  async unsubscribeGet(@Param('token') token: string, @Res() res: Response) {
    const email = await this.doUnsubscribe(token);
    if (!email) {
      res.status(400).send('Invalid or expired unsubscribe link.');
      return;
    }
    res
      .status(200)
      .send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>You're unsubscribed</h2><p>${email} will no longer receive emails from us.</p></body></html>`);
  }

  // RFC 8058 one-click unsubscribe: mail clients POST here directly.
  @Post(':token')
  async unsubscribePost(@Param('token') token: string, @Res() res: Response) {
    const email = await this.doUnsubscribe(token);
    res.status(email ? 200 : 400).send();
  }

  private async doUnsubscribe(token: string): Promise<string | null> {
    const secret = this.settings.get('TRACKING_SIGNING_SECRET');
    const email = secret ? verifyUnsubscribeToken(secret, token) : null;
    if (!email) return null;
    await this.suppression.suppress(email, 'manual_unsubscribe', 'unsubscribe_link');
    return email;
  }
}
