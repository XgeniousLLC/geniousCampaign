import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  listAll(@Query('limit') limit?: string) {
    return this.auditLogService.listAll(limit ? parseInt(limit, 10) : undefined);
  }
}
