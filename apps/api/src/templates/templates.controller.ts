import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    const created = await this.templatesService.create(dto);
    await this.auditLog.record(user, 'template.create', 'template', created.id, { name: created.name });
    return created;
  }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    const updated = await this.templatesService.update(id, dto);
    await this.auditLog.record(user, 'template.update', 'template', id, { fields: Object.keys(dto) });
    return updated;
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.templatesService.remove(id);
    await this.auditLog.record(user, 'template.delete', 'template', id);
    return result;
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.templatesService.listVersions(id, limit ? parseInt(limit, 10) : undefined);
  }
}
