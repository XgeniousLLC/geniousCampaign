import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { CircuitBreakerService } from './circuit-breaker.service';

@Controller('circuit-breaker')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CircuitBreakerController {
  constructor(
    private readonly breaker: CircuitBreakerService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get('status')
  async status() {
    const tripped = await this.breaker.isTripped();
    return { tripped, ...this.breaker.getConfig() };
  }

  @Post('reset')
  @Roles('owner')
  async reset(@CurrentUser() user: AuthenticatedUser) {
    await this.breaker.reset(user.id);
    await this.auditLog.record(user, 'circuit_breaker.reset', 'circuit_breaker', 'singleton', {});
    return { reset: true };
  }
}
