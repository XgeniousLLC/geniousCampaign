import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DrizzleService } from '../db/drizzle.service';

@Controller('circuit-breaker')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CircuitBreakerController {
  constructor(
    private readonly breaker: CircuitBreakerService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Get('status')
  async status() {
    const tripped = await this.breaker.isTripped();
    return { tripped, ...this.breaker.getConfig() };
  }

  @Post('reset')
  @Roles('owner')
  reset(@CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      await this.breaker.reset(user.id, tx);
      await this.auditLog.record(user, 'circuit_breaker.reset', 'circuit_breaker', 'singleton', {}, tx);
      return { reset: true };
    });
  }
}
