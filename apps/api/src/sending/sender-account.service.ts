import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { senderAccounts } from '../db/schema';
import { encryptToken, appEncryptionSecret } from './token-encryption.util';
import type { CreateSesAccountDto } from './dto/create-ses-account.dto';
import type { UpdateSenderAccountDto } from './dto/update-sender-account.dto';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_SES_DAILY_LIMIT = 50_000;

@Injectable()
export class SenderAccountService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  // Explicit column select — never send encrypted secrets (Gmail refresh
  // token, AWS secret key) or even the plaintext access key id to the
  // browser, same "never send secrets to the client" principle as
  // Settings > Integrations.
  listAll() {
    return this.drizzle.db
      .select({
        id: senderAccounts.id,
        provider: senderAccounts.provider,
        email: senderAccounts.email,
        displayName: senderAccounts.displayName,
        dailySendLimit: senderAccounts.dailySendLimit,
        sentToday: senderAccounts.sentToday,
        isActive: senderAccounts.isActive,
        awsRegion: senderAccounts.awsRegion,
        sesConfigurationSet: senderAccounts.sesConfigurationSet,
        hasCustomAwsCredentials: sql<boolean>`${senderAccounts.awsAccessKeyId} is not null`,
        createdAt: senderAccounts.createdAt,
      })
      .from(senderAccounts)
      .orderBy(desc(senderAccounts.createdAt));
  }

  async findOne(id: string) {
    const account = await this.drizzle.db.query.senderAccounts.findFirst({ where: eq(senderAccounts.id, id) });
    if (!account) {
      throw new NotFoundException(`Sender account ${id} not found`);
    }
    return account;
  }

  /** GC-077 — lets an admin add additional named SES accounts (e.g. a
   * second AWS account/region) with their own credentials, rather than
   * being limited to the single lazily-materialized account driven by the
   * global Settings > Integrations AWS_* values. Per-account fields left
   * blank fall back to those global values at send time (SesSenderProvider),
   * same DB-overrides-env pattern used everywhere else in this app. */
  async createSesAccount(dto: CreateSesAccountDto) {
    const [created] = await this.drizzle.db
      .insert(senderAccounts)
      .values({
        provider: 'ses',
        email: dto.email,
        displayName: dto.displayName,
        dailySendLimit: dto.dailySendLimit ?? DEFAULT_SES_DAILY_LIMIT,
        sentTodayDate: today(),
        awsRegion: dto.awsRegion,
        awsAccessKeyId: dto.awsAccessKeyId,
        awsSecretAccessKeyEncrypted: dto.awsSecretAccessKey ? encryptToken(dto.awsSecretAccessKey, appEncryptionSecret(this.config)) : undefined,
        sesConfigurationSet: dto.sesConfigurationSet,
      })
      .returning();
    return created;
  }

  async update(id: string, dto: UpdateSenderAccountDto) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(senderAccounts)
      .set({
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.dailySendLimit !== undefined ? { dailySendLimit: dto.dailySendLimit } : {}),
        ...(dto.awsRegion !== undefined ? { awsRegion: dto.awsRegion } : {}),
        ...(dto.awsAccessKeyId !== undefined ? { awsAccessKeyId: dto.awsAccessKeyId } : {}),
        ...(dto.awsSecretAccessKey ? { awsSecretAccessKeyEncrypted: encryptToken(dto.awsSecretAccessKey, appEncryptionSecret(this.config)) } : {}),
        ...(dto.sesConfigurationSet !== undefined ? { sesConfigurationSet: dto.sesConfigurationSet } : {}),
        updatedAt: new Date(),
      })
      .where(eq(senderAccounts.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(senderAccounts).where(eq(senderAccounts.id, id));
    return { id };
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

    const fromEmail = this.settings.get('SES_FROM_EMAIL') || 'noreply@example.com';
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
