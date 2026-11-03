import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { SuppressionService } from './suppression.service';
import { SettingsService } from '../settings/settings.service';
import { verifyUnsubscribeToken } from '../sending/unsubscribe-token.util';
import {
  renderInvalidUnsubscribePage,
  renderUnsubscribePage,
} from './unsubscribe-page.util';

@Public()
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(
    private readonly suppression: SuppressionService,
    private readonly settings: SettingsService,
  ) {}

  /** Human-facing unsubscribe link. Deliberately does NOT unsubscribe on
   * GET: mail clients and security scanners prefetch links, which used to
   * opt recipients out before they ever saw the page. The page itself walks
   * the recipient through a 3-step confirmation and then calls
   * POST /unsubscribe/:token/confirm. */
  @Get(':token')
  unsubscribePage(@Param('token') token: string, @Res() res: Response) {
    this.setNoStoreHeaders(res);
    const email = this.decodeToken(token);
    if (!email) {
      res.status(400).type('html').send(renderInvalidUnsubscribePage());
      return;
    }
    res.status(200).type('html').send(renderUnsubscribePage(token, email));
  }

  // RFC 8058 one-click unsubscribe: mail clients POST here directly. This
  // stays an immediate opt-out — adding steps here would break the
  // one-click contract that inbox providers rely on.
  @Post(':token')
  async unsubscribePost(@Param('token') token: string, @Res() res: Response) {
    const email = await this.doUnsubscribe(token);
    res.status(email ? 200 : 400).send();
  }

  // Called by the confirmation page after all 3 steps. Same signed token as
  // the GET page, so it can't be replayed for a different address.
  @Post(':token/confirm')
  async unsubscribeConfirm(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const email = await this.doUnsubscribe(token);
    if (!email) {
      res
        .status(400)
        .json({ ok: false, error: 'Invalid or expired unsubscribe link.' });
      return;
    }
    res.status(200).json({ ok: true });
  }

  private setNoStoreHeaders(res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }

  private decodeToken(token: string): string | null {
    const secret = this.settings.get('TRACKING_SIGNING_SECRET');
    return secret ? verifyUnsubscribeToken(secret, token) : null;
  }

  private async doUnsubscribe(token: string): Promise<string | null> {
    const email = this.decodeToken(token);
    if (!email) return null;
    await this.suppression.suppress(
      email,
      'manual_unsubscribe',
      'unsubscribe_link',
    );
    return email;
  }
}
