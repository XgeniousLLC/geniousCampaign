import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// Owner-only, matches GET /audit-log's precedent — these are real
// credentials for paid/production services, not general app config.
@Controller('settings/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @Roles('owner')
  getAll() {
    return this.settings.getAllForDisplay();
  }

  @Patch()
  @Roles('owner')
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    await this.settings.setMany(dto.values);
    await this.auditLog.record(user, 'settings.integrations.update', 'settings', 'integrations', { keys: Object.keys(dto.values) });
    return this.settings.getAllForDisplay();
  }

  @Delete(':key')
  @Roles('owner')
  async clear(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    await this.settings.clear(key);
    await this.auditLog.record(user, 'settings.integrations.clear', 'settings', key);
    return this.settings.getAllForDisplay();
  }
}
