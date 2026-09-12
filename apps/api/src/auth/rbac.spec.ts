import { ExecutionContext, ForbiddenException, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from './users.service';
import { ContactImportController } from '../contacts/import/contact-import.controller';
import { SuppressionController } from '../suppression/suppression.controller';
import { HealthController } from '../health/health.controller';
import { TrackingController } from '../tracking/tracking.controller';
import { UnsubscribeController } from '../suppression/unsubscribe.controller';
import { InboundWebhookController } from '../webhooks/inbound-webhook.controller';
import { DebugLogController } from '../debug-log/debug-log.controller';
import { PublicApiController } from '../public-api/public-api.controller';

// --- helpers ---
function mockContext(user?: any, handlerMeta: Map<string, any> = new Map(), classMeta: Map<string, any> = new Map()): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn((key: string, targets: any[]) => {
      // handler first, then class
      for (const t of targets) {
        if (t === 'handler' && handlerMeta.has(key)) return handlerMeta.get(key);
        if (t === 'class' && classMeta.has(key)) return classMeta.get(key);
      }
      return undefined;
    }),
  } as unknown as Reflector;
  const ctx = {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
  } as unknown as ExecutionContext;
  return { reflector, ctx } as any;
}

describe('@Public decorator', () => {
  it('sets isPublic metadata', () => {
    class Dummy {
      @Public()
      handler() {}
    }
    const meta = Reflect.getMetadata(IS_PUBLIC_KEY, Dummy.prototype.handler);
    expect(meta).toBe(true);
  });

  it('ROLES metadata round-trips', () => {
    const { Roles } = require('./roles.decorator');
    class Dummy {
      @Roles('owner', 'editor')
      handler() {}
    }
    const meta = Reflect.getMetadata(ROLES_KEY, Dummy.prototype.handler);
    expect(meta).toEqual(['owner', 'editor']);
  });
});

describe('JwtAuthGuard canActivate', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new JwtAuthGuard(reflector);
    // Avoid calling real passport authenticate; stub super.canActivate
    jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockImplementation(function (this: any, ctx: ExecutionContext) {
      // Simulate passport calling super: if not public, would check JWT
      return true as any;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('bypasses auth when @Public()', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }) } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('delegates to passport when not public', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const superSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockReturnValue(true as any);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as any;
    guard.canActivate(ctx);
    expect(superSpy).toHaveBeenCalled();
  });
});

describe('RolesGuard canActivate', () => {
  it('allows when @Public()', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => (key === IS_PUBLIC_KEY ? true : undefined)) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: 'viewer' } }) }) } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when no @Roles metadata (any authenticated role)', () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: 'viewer' } }) }) } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows owner/editor on @Roles(owner,editor)', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => (key === ROLES_KEY ? ['owner', 'editor'] : undefined)) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    for (const role of ['owner', 'editor']) {
      const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) } as any;
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('forbids viewer on @Roles(owner,editor)', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => (key === ROLES_KEY ? ['owner', 'editor'] : undefined)) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: 'viewer' } }) }) } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('forbids when no user (unauthenticated) but roles required', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => (key === ROLES_KEY ? ['owner'] : undefined)) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }) } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('forbids editor on owner-only route', () => {
    const reflector = { getAllAndOverride: jest.fn((key: string) => (key === ROLES_KEY ? ['owner'] : undefined)) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: 'editor' } }) }) } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('reads Roles from handler first then class', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const Roles = (target: any, key?: any, desc?: any) => (SetMetadata(ROLES_KEY, ['editor']) as any)(target, key, desc);
    class Ctrl {
      @Roles
      handler(): void {}
    }
    (SetMetadata(ROLES_KEY, ['owner']) as any)(Ctrl);
    const ctx = {
      getHandler: () => Ctrl.prototype.handler,
      getClass: () => Ctrl,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'editor' } }) }),
    } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

describe('JwtStrategy.validate (DB-validated live role)', () => {
  function makeStrategy(mockUser: any) {
    const drizzle = {
      db: { query: { users: { findFirst: jest.fn().mockResolvedValue(mockUser) } } },
    } as any;
    const config = { get: jest.fn().mockReturnValue('test-secret') } as any;
    return { strategy: new JwtStrategy(config, drizzle), drizzle };
  }

  it('returns live DB role, not stale payload role', async () => {
    const dbUser = { id: 'u1', email: 'a@example.com', role: 'viewer' };
    const { strategy } = makeStrategy(dbUser);
    const payload = { sub: 'u1', email: 'a@example.com', role: 'owner' as any };
    const result = await strategy.validate(payload as any);
    expect(result).toEqual({ id: 'u1', email: 'a@example.com', role: 'viewer' });
  });

  it('throws Unauthorized when user deleted (stale token after deletion)', async () => {
    const { strategy } = makeStrategy(null);
    await expect(strategy.validate({ sub: 'missing', email: 'x@x.com', role: 'owner' } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('throws Unauthorized when user not found (token for non-existent id)', async () => {
    const { strategy, drizzle } = makeStrategy(null);
    drizzle.db.query.users.findFirst.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'nope', email: 'nope@example.com', role: 'editor' } as any)).rejects.toThrow(/no longer exists/);
  });
});

describe('UsersService.updateRole — last-owner guard', () => {
  function mockDrizzle(user: any, ownerCount: number) {
    const db: any = {
      query: { users: { findFirst: jest.fn().mockResolvedValue(user) } },
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ ownerCount }]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: user?.id ?? 'u1', email: user?.email ?? 'a@a.com', role: 'editor', createdAt: new Date() }]),
          }),
        }),
      }),
    };
    const drizzle = { db } as any;
    return { drizzle, db };
  }

  it('throws 409 when demoting the last owner', async () => {
    const user = { id: 'u1', role: 'owner', email: 'owner@example.com' };
    const { drizzle } = mockDrizzle(user, 1);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('u1', 'editor' as any, drizzle.db)).rejects.toThrow(/last owner/i);
  });

  it('allows demoting owner when another owner exists', async () => {
    const user = { id: 'u1', role: 'owner', email: 'owner@example.com' };
    const { drizzle } = mockDrizzle(user, 2);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('u1', 'editor' as any, drizzle.db)).resolves.toBeDefined();
  });

  it('allows promoting viewer to owner regardless of count', async () => {
    const user = { id: 'u2', role: 'viewer', email: 'v@example.com' };
    const { drizzle } = mockDrizzle(user, 1);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('u2', 'owner' as any, drizzle.db)).resolves.toBeDefined();
  });

  it('allows owner -> owner (no-op) even as last owner', async () => {
    const user = { id: 'u1', role: 'owner', email: 'owner@example.com' };
    const { drizzle } = mockDrizzle(user, 1);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('u1', 'owner' as any, drizzle.db)).resolves.toBeDefined();
  });

  it('throws 404 when user not found', async () => {
    const { drizzle } = mockDrizzle(null, 0);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('missing', 'editor' as any, drizzle.db)).rejects.toThrow(/not found/i);
  });

  it('allows viewer -> editor even with single owner present', async () => {
    const user = { id: 'u3', role: 'viewer', email: 'viewer@example.com' };
    const { drizzle } = mockDrizzle(user, 1);
    const svc = new UsersService(drizzle);
    await expect(svc.updateRole('u3', 'editor' as any, drizzle.db)).resolves.toBeDefined();
  });
});

describe('Import & suppression guard metadata', () => {
  it('contacts/import POST is owner|editor (not public)', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ContactImportController.prototype.upload);
    expect(roles).toEqual(['owner', 'editor']);
  });

  it('suppression manual/unsubscribe are owner|editor', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SuppressionController.prototype.manualSuppress)).toEqual(['owner', 'editor']);
    expect(Reflect.getMetadata(ROLES_KEY, SuppressionController.prototype.manualUnsubscribe)).toEqual(['owner', 'editor']);
  });

  it('public surfaces are marked @Public()', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TrackingController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, UnsubscribeController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, InboundWebhookController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, DebugLogController.prototype.report)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicApiController)).toBe(true);
  });
});
