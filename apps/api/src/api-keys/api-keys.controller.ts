import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';

// Managing keys (creating/revoking) is a credential-issuing action, same
// trust level as Settings > Integrations — owner-only.
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class ApiKeysController {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  findAll() {
    return this.apiKeys.findAll();
  }

  @Post()
  async create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.apiKeys.create(dto, user);
    await this.auditLog.record(user, 'api_keys.create', 'api_key', created.id, { name: created.name });
    return created;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.apiKeys.remove(id);
    await this.auditLog.record(user, 'api_keys.revoke', 'api_key', id);
    return result;
  }
}
