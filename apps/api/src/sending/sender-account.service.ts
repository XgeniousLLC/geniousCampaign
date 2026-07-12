import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { senderAccounts } from '../db/schema';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_SES_DAILY_LIMIT = 50_000;

@Injectable()
export class SenderAccountService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
  ) {}

  listAll() {
    return this.drizzle.db.query.senderAccounts.findMany({ orderBy: (a, { desc }) => desc(a.createdAt) });
  }

  /** SES has no per-mailbox OAuth connect step, but still participates in
   * quota-based rotation (invariant 7) — lazily materialize its account row
   * the first time anything needs to pick a sender, rather than requiring a
   * separate seed step. */
  private async ensureSesAccount() {
    const existing = await this.drizzle.db.query.senderAccounts.findFirst({
      where: eq(senderAccounts.provider, 'ses'),
    });
    if (existing) return existing;

    const fromEmail = this.config.get<string>('SES_FROM_EMAIL') || 'noreply@example.com';
    const [created] = await this.drizzle.db
      .insert(senderAccounts)
      .values({
        provider: 'ses',
        email: fromEmail,
        displayName: 'AWS SES',
        dailySendLimit: DEFAULT_SES_DAILY_LIMIT,
        sentTodayDate: today(),
      })
      .returning();
    return created;
  }

  private async resetIfNewDay(account: typeof senderAccounts.$inferSelect) {
    if (account.sentTodayDate === today()) return account;
    const [updated] = await this.drizzle.db
      .update(senderAccounts)
      .set({ sentToday: 0, sentTodayDate: today(), updatedAt: new Date() })
      .where(eq(senderAccounts.id, account.id))
      .returning();
    return updated;
  }

  /** Picks the active account with the most remaining daily headroom
   * (dailySendLimit - sentToday) — the core of invariant 7's rotation.
   * Falls through to the next-best account automatically; only throws if
   * every account (including SES) is exhausted or inactive. */
  async pickAccountForSend(): Promise<typeof senderAccounts.$inferSelect> {
    await this.ensureSesAccount();
    const candidates = await this.drizzle.db.query.senderAccounts.findMany({
      where: eq(senderAccounts.isActive, true),
    });
    const fresh = await Promise.all(candidates.map((c) => this.resetIfNewDay(c)));

    const withHeadroom = fresh
      .map((a) => ({ account: a, headroom: a.dailySendLimit - a.sentToday }))
      .filter((a) => a.headroom > 0)
      .sort((a, b) => b.headroom - a.headroom);

    if (withHeadroom.length === 0) {
      throw new InternalServerErrorException('Every sender account has exhausted its daily send limit — cannot send.');
    }
    return withHeadroom[0].account;
  }

  async recordSend(accountId: string) {
    await this.drizzle.db
      .update(senderAccounts)
      .set({ sentToday: sql`${senderAccounts.sentToday} + 1`, updatedAt: new Date() })
      .where(eq(senderAccounts.id, accountId));
  }

  async upsertGmailAccount(email: string, displayName: string | undefined, encryptedRefreshToken: string) {
    const existing = await this.drizzle.db.query.senderAccounts.findFirst({
      where: and(eq(senderAccounts.provider, 'gmail'), eq(senderAccounts.email, email)),
    });
    const gmailDailyLimit = Number(this.config.get<string>('GMAIL_DEFAULT_DAILY_LIMIT') ?? 300);

    if (existing) {
      const [updated] = await this.drizzle.db
        .update(senderAccounts)
        .set({ gmailRefreshTokenEncrypted: encryptedRefreshToken, displayName, isActive: true, updatedAt: new Date() })
        .where(eq(senderAccounts.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.drizzle.db
      .insert(senderAccounts)
      .values({
        provider: 'gmail',
        email,
        displayName,
        dailySendLimit: gmailDailyLimit,
        sentTodayDate: today(),
        gmailRefreshTokenEncrypted: encryptedRefreshToken,
      })
      .returning();
    return created;
  }
}
