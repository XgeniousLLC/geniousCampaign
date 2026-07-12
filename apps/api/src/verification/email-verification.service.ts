import { Injectable, Logger } from '@nestjs/common';
import { eq, gt, and } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { verificationResults } from '../db/schema';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
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
      return { status: 'invalid', isDeliverable: false, provider: 'local', cached: false };
    }

    const cached = await this.drizzle.db.query.verificationResults.findFirst({
      where: and(eq(verificationResults.email, email), gt(verificationResults.expiresAt, new Date())),
    });
    if (cached) {
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
    return { ...result, provider, cached: false };
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
