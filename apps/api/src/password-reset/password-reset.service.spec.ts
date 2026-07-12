import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { PasswordResetService } from './password-reset.service';
import { UsersService } from '../auth/users.service';
import { SendDispatcherService } from '../sending/send-dispatcher.service';
import { SenderAccountService } from '../sending/sender-account.service';
import { SesSenderProvider } from '../sending/ses-sender.provider';
import { GmailSenderProvider } from '../sending/gmail-sender.provider';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { DrizzleService } from '../db/drizzle.service';
import { users, passwordResetTokens } from '../db/schema';

describe('PasswordResetService (integration, real DB)', () => {
  let service: PasswordResetService;
  let usersService: UsersService;
  let drizzle: DrizzleService;
  let userId: string;
  const userEmail = `reset-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }), EventEmitterModule.forRoot()],
      providers: [
        PasswordResetService,
        UsersService,
        SendDispatcherService,
        SenderAccountService,
        SesSenderProvider,
        GmailSenderProvider,
        CircuitBreakerService,
        EnrollmentService,
        DrizzleService,
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
    usersService = moduleRef.get(UsersService);
    drizzle = moduleRef.get(DrizzleService);

    const created = await usersService.register(userEmail, 'OriginalPassword123');
    userId = created.id;
  });

  afterAll(async () => {
    await drizzle.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await drizzle.db.delete(users).where(eq(users.id, userId));
  });

  it('resolves silently for an unknown email — never reveals whether an account exists', async () => {
    await expect(service.requestReset('no-such-user@example.com')).resolves.toBeUndefined();
    // Scoped to this test's own user — the table isn't guaranteed empty
    // globally (other tests/manual live-testing may leave rows behind).
    const tokens = await drizzle.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    expect(tokens.length).toBe(0); // no token created for an unknown email
  });

  it('creates a real token and attempts a real send for a known email — fails cleanly since SES is unconfigured, never fakes success', async () => {
    await expect(service.requestReset(userEmail)).rejects.toThrow(/SES is not configured/);

    const tokens = await drizzle.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    expect(tokens.length).toBe(1); // the token itself was created before the send attempt
    expect(tokens[0].usedAt).toBeNull();
  });

  it('rejects an invalid token', async () => {
    await expect(service.resetPassword('not-a-real-token', 'NewPassword123')).rejects.toThrow(/invalid or has expired/);
  });

  it('accepts a valid token, updates the password, and the token cannot be reused', async () => {
    const rawToken = 'test-raw-token-value';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await drizzle.db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.resetPassword(rawToken, 'BrandNewPassword123');

    // New password actually works.
    const validated = await usersService.validateCredentials(userEmail, 'BrandNewPassword123');
    expect(validated.id).toBe(userId);

    // Same token can't be used twice.
    await expect(service.resetPassword(rawToken, 'AnotherPassword123')).rejects.toThrow(/invalid or has expired/);
  });

  it('rejects an expired token', async () => {
    const rawToken = 'expired-token-value';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await drizzle.db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000), // already expired
    });

    await expect(service.resetPassword(rawToken, 'YetAnotherPassword123')).rejects.toThrow(/invalid or has expired/);
  });
});
