import { Injectable, Logger } from '@nestjs/common';
import { eq, gt, and } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { verificationResults, contacts } from '../db/schema';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
import { SuppressionService } from '../suppression/suppression.service';
import { SettingsService } from '../settings/settings.service';
import { RateLimitError, type EmailVerificationProvider, type VerificationProviderResult } from './verification-provider.interface';

const TTL_DAYS = 180; // 6 months — within GC-049's 6-12 month window
// A provider failure (quota exhausted, misconfigured, transient outage) is
// cached this briefly so a repeat "Bulk verify" click doesn't immediately
// re-hammer the same already-attempted batch — long enough to skip an
// instant retry loop, short enough to pick the contact back up well before
// TTL_DAYS's real cache would.
const FAILURE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
// Rate limits are usually transient (a per-minute/per-second cap resetting
// on its own) — a much shorter cooldown than a hard failure so the next
// bulk-verify click (or the same one, minutes later) naturally picks the
// email back up instead of waiting out the full hour.
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_DEFAULT_BACKOFFS_MS = [2000, 5000, 15000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    private readonly settings: SettingsService,
  ) {}

  /** VERIFICATION_PROVIDER (Settings > Integrations > Email verification)
   * picks which provider is tried first — defaults to Reoon. The other is
   * only called as a fallback when the default fails or errors. */
  private providerOrder(): [{ name: 'reoon' | 'neverbounce'; provider: EmailVerificationProvider }, { name: 'reoon' | 'neverbounce'; provider: EmailVerificationProvider }] {
    const reoon = { name: 'reoon' as const, provider: this.reoon };
    const neverBounce = { name: 'neverbounce' as const, provider: this.neverBounce };
    return this.settings.get('VERIFICATION_PROVIDER') === 'neverbounce' ? [neverBounce, reoon] : [reoon, neverBounce];
  }

  /**
   * Local pre-filter first (GC-048) — a syntactically invalid, disposable,
   * or no-MX address never reaches a paid API. Then the cache, keyed by
   * email with a 6-month TTL — a cache hit also never reaches a paid API.
   * Only then the default provider (VERIFICATION_PROVIDER), falling back to
   * the other provider on any failure.
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

    const [primary, fallback] = this.providerOrder();
    let result: VerificationProviderResult | undefined;
    let provider: 'reoon' | 'neverbounce' = primary.name;
    let primaryErr: unknown;
    let primaryRateLimited = false;
    try {
      result = await this.callWithRateLimitRetry(primary.name, () => primary.provider.verify(email));
    } catch (err) {
      primaryErr = err;
      primaryRateLimited = err instanceof RateLimitError;
      this.logger.warn(`${primary.name} failed for ${email}: ${this.errMessage(err)}`);
    }

    if (!result) {
      // Only actually call the fallback if it has an API key configured —
      // otherwise this just replaces a real, diagnosable primary error (e.g.
      // Reoon rate-limited/quota exhausted) with a useless "<fallback> is
      // not configured" error that has nothing to do with what broke, and
      // wastes a network round-trip getting there.
      if (this.isConfigured(fallback.name)) {
        try {
          result = await this.callWithRateLimitRetry(fallback.name, () => fallback.provider.verify(email));
          provider = fallback.name;
        } catch (fallbackErr) {
          const rateLimited = primaryRateLimited && fallbackErr instanceof RateLimitError;
          await this.cacheFailure(email, primary.name, rateLimited);
          throw new Error(
            `${primary.name} failed (${this.errMessage(primaryErr)}); fallback ${fallback.name} also failed (${this.errMessage(fallbackErr)})`,
          );
        }
      } else {
        await this.cacheFailure(email, primary.name, primaryRateLimited);
        if (primaryRateLimited) {
          throw new Error(
            `${primary.name} is rate-limiting requests (retried ${RATE_LIMIT_MAX_RETRIES}x) — it will auto-retry on the next Bulk verify run in a few minutes.`,
          );
        }
        throw primaryErr instanceof Error ? primaryErr : new Error(this.errMessage(primaryErr));
      }
    }

    await this.cacheResult(email, result, provider);
    await this.maybeAutoSuppress(email, result.status);
    return { ...result, provider, cached: false };
  }

  /** Rate limits are usually transient — retry the same provider with
   * backoff (honoring a Retry-After header when the provider sends one)
   * before treating it as a real failure. Any other error type is not
   * retried here; verify() decides whether to fall back to the other
   * provider instead. */
  private async callWithRateLimitRetry<T>(providerName: 'reoon' | 'neverbounce', call: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (err) {
        if (!(err instanceof RateLimitError) || attempt >= RATE_LIMIT_MAX_RETRIES) throw err;
        const wait = err.retryAfterMs ?? RATE_LIMIT_DEFAULT_BACKOFFS_MS[attempt] ?? RATE_LIMIT_DEFAULT_BACKOFFS_MS.at(-1)!;
        this.logger.warn(`${providerName} rate-limited — retrying in ${wait}ms (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})`);
        await sleep(wait);
      }
    }
  }

  private isConfigured(name: 'reoon' | 'neverbounce'): boolean {
    return !!this.settings.get(name === 'reoon' ? 'REOON_API_KEY' : 'NEVERBOUNCE_API_KEY');
  }

  private errMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  /** Short-TTL placeholder so listUnverifiedActiveContacts() (bulk verify's
   * work queue) skips this email until the cooldown expires, instead of
   * retrying it on every single click while the provider is still down. Not
   * a real result — status 'unknown' is excluded from the Valid/Invalid/Risky
   * stats, so this can't misrepresent deliverability. Rate-limit failures
   * get a much shorter cooldown (they tend to self-resolve) than a hard
   * config/outage failure. */
  private async cacheFailure(email: string, attemptedProvider: 'reoon' | 'neverbounce', rateLimited: boolean) {
    const expiresAt = new Date(Date.now() + (rateLimited ? RATE_LIMIT_COOLDOWN_MS : FAILURE_COOLDOWN_MS));
    await this.drizzle.db
      .insert(verificationResults)
      .values({ email, status: 'unknown', isDeliverable: false, provider: attemptedProvider, expiresAt })
      .onConflictDoUpdate({
        target: verificationResults.email,
        set: { status: 'unknown', isDeliverable: false, provider: attemptedProvider, checkedAt: new Date(), expiresAt },
      });
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

  /** Switching VERIFICATION_PROVIDER only affects emails not already cached
   * (6-month TTL) — this lets an admin force everything to re-check against
   * the newly-picked provider instead of waiting out the old cache. */
  async clearCache() {
    const { rowCount } = await this.drizzle.db.delete(verificationResults);
    return { cleared: rowCount ?? 0 };
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
