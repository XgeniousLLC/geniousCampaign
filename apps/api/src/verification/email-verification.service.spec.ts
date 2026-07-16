import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { EmailVerificationService } from './email-verification.service';
import { LocalVerifyService } from './local-verify.service';
import { ReoonProvider } from './reoon.provider';
import { NeverBounceProvider } from './neverbounce.provider';
import { DrizzleService } from '../db/drizzle.service';
import { SettingsService } from '../settings/settings.service';
import { SuppressionService } from '../suppression/suppression.service';
import { verificationResults, suppressionList } from '../db/schema';

describe('EmailVerificationService (integration, real DB, mocked HTTP)', () => {
  let service: EmailVerificationService;
  let drizzle: DrizzleService;
  const testEmail = `gc049-test-${Date.now()}@example.com`;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }), EventEmitterModule.forRoot()],
      providers: [
        EmailVerificationService,
        LocalVerifyService,
        ReoonProvider,
        NeverBounceProvider,
        DrizzleService,
        SettingsService,
        SuppressionService,
      ],
    }).compile();

    // Real ConfigService (so DrizzleService still gets a real DATABASE_URL),
    // with just the two provider API keys overridden so the providers
    // attempt a call at all — the HTTP layer itself is mocked below,
    // never a real network call.
    const realConfig = moduleRef.get(ConfigService);
    const overrides: Record<string, string> = { REOON_API_KEY: 'test-reoon-key', NEVERBOUNCE_API_KEY: 'test-nb-key' };
    jest.spyOn(realConfig, 'get').mockImplementation(
      ((key: string) => overrides[key] ?? ConfigService.prototype.get.call(realConfig, key)) as typeof realConfig.get,
    );

    service = moduleRef.get(EmailVerificationService);
    drizzle = moduleRef.get(DrizzleService);
  });

  afterEach(async () => {
    fetchSpy?.mockRestore();
  });

  afterAll(async () => {
    await drizzle.db.delete(verificationResults).where(eq(verificationResults.email, testEmail));
    await drizzle.db.delete(suppressionList).where(eq(suppressionList.email, 'not-an-email'));
  });

  it('rejects a syntactically invalid address without any external API call, and auto-suppresses it (GC-117)', async () => {
    fetchSpy = jest.spyOn(global, 'fetch');
    const result = await service.verify('not-an-email');
    expect(result).toEqual({ status: 'invalid', isDeliverable: false, provider: 'local', cached: false });
    expect(fetchSpy).not.toHaveBeenCalled();

    const suppressed = await drizzle.db.query.suppressionList.findFirst({ where: eq(suppressionList.email, 'not-an-email') });
    expect(suppressed?.reason).toBe('invalid_email');
  });

  it('calls Reoon once, caches the result, and a second verify within the TTL makes zero further calls', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'safe' }),
    } as Response);

    const first = await service.verify(testEmail);
    expect(first).toEqual({ status: 'valid', isDeliverable: true, provider: 'reoon', cached: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await service.verify(testEmail);
    expect(second).toEqual({ status: 'valid', isDeliverable: true, provider: 'reoon', cached: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no new call — served from cache
  });

  it('falls back to NeverBounce when Reoon fails, rather than failing the whole verification', async () => {
    const fallbackEmail = `gc049-fallback-${Date.now()}@example.com`;
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('reoon')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
      }
      return { ok: true, json: async () => ({ status: 'success', result: 'valid' }) } as Response;
    });

    const result = await service.verify(fallbackEmail);
    expect(result).toEqual({ status: 'valid', isDeliverable: true, provider: 'neverbounce', cached: false });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // Reoon attempted, then NeverBounce

    await drizzle.db.delete(verificationResults).where(eq(verificationResults.email, fallbackEmail));
  });
});
