import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { passwordResetTokens } from '../db/schema';
import { UsersService } from '../auth/users.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly sendDispatcher: SendDispatcherService,
  ) {}

  /**
   * Always resolves the same way regardless of whether the email exists —
   * never lets a caller enumerate which addresses have accounts. The real
   * work (token + email) only happens if a matching user is found.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      this.logger.log(`Password reset requested for unknown email ${email} — no-op`);
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    await this.drizzle.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const appUrl = this.config.get<string>('ADMIN_APP_URL') || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // Reuses the one shared sending path (invariant 7) rather than a
    // parallel transactional-email pathway — unsubscribeUrl doesn't really
    // apply to a password-reset email, so it's set to the app URL itself
    // rather than a real unsubscribe link.
    await this.sendDispatcher.send({
      to: user.email,
      subject: 'Reset your geniusCampaign password',
      html: `<p>Someone requested a password reset for this account.</p><p><a href="${resetUrl}">Reset your password</a> — this link expires in 1 hour.</p><p>If you didn't request this, you can ignore this email.</p>`,
      text: `Reset your password: ${resetUrl} (expires in 1 hour). If you didn't request this, ignore this email.`,
      unsubscribeUrl: appUrl,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const record = await this.drizzle.db.query.passwordResetTokens.findFirst({
      where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)),
    });
    if (!record) {
      throw new BadRequestException('This reset link is invalid or has expired — request a new one.');
    }

    await this.users.setPassword(record.userId, newPassword);
    await this.drizzle.db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, record.id));
  }
}
