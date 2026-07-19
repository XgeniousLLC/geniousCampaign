import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDefDto } from './dto/create-custom-field-def.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';

// Reads are open to any authenticated role — the Add contact form (any
// role) needs the field list to render its dynamic inputs. Defining/removing
// a field is a schema-shaping action, owner-only like Settings > Integrations.
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomFieldsController {
  constructor(
    private readonly customFields: CustomFieldsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  findAll() {
    return this.customFields.findAll();
  }

  @Post()
  @Roles('owner')
  async create(@Body() dto: CreateCustomFieldDefDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.customFields.create(dto);
    await this.auditLog.record(user, 'custom_fields.create', 'custom_field_def', created.id, { key: created.key });
    return created;
  }

  @Delete(':id')
  @Roles('owner')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.customFields.remove(id);
    await this.auditLog.record(user, 'custom_fields.remove', 'custom_field_def', id);
    return result;
  }
}
