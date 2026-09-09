import { TrackingService } from './tracking.service';
import type { DrizzleService } from '../db/drizzle.service';
import type { ConfigService } from '@nestjs/config';
import type { SettingsService } from '../settings/settings.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { DebugLogService } from '../debug-log/debug-log.service';

// baseUrl is a pure function of config (VITE_API_BASE_URL/PORT) — no custom
// tracking domain concept exists anymore (removed 2026-09-08, CLAUDE.md
// invariant 15), so settings/drizzle/events/debugLog are unused by these
// tests and a bare stub covers them.
const noopDrizzle = {} as unknown as DrizzleService;
const noopSettings = {} as unknown as SettingsService;
const noopEvents = {} as unknown as EventEmitter2;
const noopDebugLog = {} as unknown as DebugLogService;

function makeService(configValues: Record<string, string | undefined>, debugLog: DebugLogService = noopDebugLog) {
  const config = {
    get: (key: string) => configValues[key],
  } as unknown as ConfigService;
  return new TrackingService(
    noopDrizzle,
    config,
    noopSettings,
    noopEvents,
    debugLog,
  );
}

describe('TrackingService.baseUrl', () => {
  it('uses VITE_API_BASE_URL with zero admin setup', () => {
    const service = makeService({
      VITE_API_BASE_URL: 'https://campaign-api.example.com',
    });
    expect(service.baseUrl).toBe('https://campaign-api.example.com');
  });

  it('strips a trailing slash from VITE_API_BASE_URL', () => {
    const service = makeService({
      VITE_API_BASE_URL: 'https://campaign-api.example.com/',
    });
    expect(service.baseUrl).toBe('https://campaign-api.example.com');
  });

  it('only falls back to localhost when nothing at all is configured (bare local dev)', () => {
    const service = makeService({ PORT: '4100' });
    expect(service.baseUrl).toBe('http://localhost:4100');
  });
});

describe('TrackingService.onModuleInit — production misconfiguration guard', () => {
  function makeDebugLog() {
    return { record: jest.fn() } as unknown as DebugLogService;
  }

  it('records a misconfiguration when VITE_API_BASE_URL is unset in production', () => {
    const debugLog = makeDebugLog();
    const service = makeService({ NODE_ENV: 'production' }, debugLog);
    service.onModuleInit();
    expect(debugLog.record).toHaveBeenCalledTimes(1);
    expect((debugLog.record as jest.Mock).mock.calls[0][0].message).toContain('[TRACKING_MISCONFIGURED]');
  });

  it('records a misconfiguration when VITE_API_BASE_URL points at localhost in production', () => {
    const debugLog = makeDebugLog();
    const service = makeService({ NODE_ENV: 'production', VITE_API_BASE_URL: 'http://localhost:3000' }, debugLog);
    service.onModuleInit();
    expect(debugLog.record).toHaveBeenCalledTimes(1);
  });

  it('does nothing when VITE_API_BASE_URL is a real URL in production', () => {
    const debugLog = makeDebugLog();
    const service = makeService({ NODE_ENV: 'production', VITE_API_BASE_URL: 'https://campaign-api.example.com' }, debugLog);
    service.onModuleInit();
    expect(debugLog.record).not.toHaveBeenCalled();
  });

  it('does nothing outside production even when unset', () => {
    const debugLog = makeDebugLog();
    const service = makeService({ NODE_ENV: 'development' }, debugLog);
    service.onModuleInit();
    expect(debugLog.record).not.toHaveBeenCalled();
  });
});
