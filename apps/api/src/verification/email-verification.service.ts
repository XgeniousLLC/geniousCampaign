import { Injectable, Logger } from '@nestjs/common';
import { eq, gt, and } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { verificationResults, contacts } from '../db/schema';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
import { SuppressionService } from '../suppression/suppression.service';
import type { VerificationProviderResult } from './verification-provider.interface';

const TTL_DAYS = 180; // 6 months — within GC-049's 6-12 month window

export interface VerificationOutcome extends VerificationProviderResult {
  provider: 'local' | 'reoon' | 'neverbounce';
  cached: boolean;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly localVerify: LocalVerifyService,
    private readonly reoon: ReoonProvider,
    private readonly neverBounce: NeverBounceProvider,
    private readonly suppression: SuppressionService,
  ) {}

  /**
   * Local pre-filter first (GC-048) — a syntactically invalid, disposable,
   * or no-MX address never reaches a paid API. Then the cache, keyed by
   * email with a 6-month TTL — a cache hit also never reaches a paid API.
   * Only then Reoon, falling back to NeverBounce on any Reoon failure.
   */
  async verify(email: string): Promise<VerificationOutcome> {
    const local = await this.localVerify.check(email);
    if (!local.valid) {
      await this.maybeAutoSuppress(email, 'invalid');
      return { status: 'invalid', isDeliverable: false, provider: 'local', cached: false };
    }

    const cached = await this.drizzle.db.query.verificationResults.findFirst({
      where: and(eq(verificationResults.email, email), gt(verificationResults.expiresAt, new Date())),
    });
    if (cached) {
      await this.maybeAutoSuppress(email, cached.status);
      return { status: cached.status, isDeliverable: cached.isDeliverable, provider: cached.provider as 'reoon' | 'neverbounce', cached: true };
    }

    let result: VerificationProviderResult;
    let provider: 'reoon' | 'neverbounce';
    try {
      result = await this.reoon.verify(email);
      provider = 'reoon';
    } catch (reoonErr) {
      this.logger.warn(`Reoon failed for ${email}, falling back to NeverBounce: ${reoonErr instanceof Error ? reoonErr.message : reoonErr}`);
      result = await this.neverBounce.verify(email);
      provider = 'neverbounce';
    }

    await this.cacheResult(email, result, provider);
    await this.maybeAutoSuppress(email, result.status);
    return { ...result, provider, cached: false };
  }

  /** Contacts.CLAUDE.md invariant 8: suppression is checked before every
   * send, so a verify result that means "don't send here" — invalid or
   * risky — must land in suppression_list immediately, not just get shown
   * as a red icon the admin has to act on manually. Mirrors an email that
   * isn't tied to any contact (e.g. verified directly, before import) —
   * suppression.suppress() only needs the email string, and the contacts
   * row update below is a no-op where no matching contact exists yet. */
  private async maybeAutoSuppress(email: string, status: string) {
    if (status !== 'invalid' && status !== 'risky') return;
    await this.suppression.suppress(email, 'invalid_email', 'verification');
    await this.drizzle.db.update(contacts).set({ status: 'suppressed', updatedAt: new Date() }).where(eq(contacts.email, email));
  }

  private async cacheResult(email: string, result: VerificationProviderResult, provider: 'reoon' | 'neverbounce') {
    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.drizzle.db
      .insert(verificationResults)
      .values({ email, status: result.status, isDeliverable: result.isDeliverable, provider, expiresAt })
      .onConflictDoUpdate({
        target: verificationResults.email,
        set: { status: result.status, isDeliverable: result.isDeliverable, provider, checkedAt: new Date(), expiresAt },
      });
  }
}
