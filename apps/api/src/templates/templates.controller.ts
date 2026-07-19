import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { DrizzleService } from '../db/drizzle.service';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const created = await this.templatesService.create(dto, tx);
      await this.auditLog.record(user, 'template.create', 'template', created.id, { name: created.name }, tx);
      return created;
    });
  }

  @Post('send-test')
  @Roles('owner', 'editor')
  async sendTest(@Body() dto: SendTestEmailDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.templatesService.sendTestEmail(dto);
    await this.auditLog.record(user, 'template.send_test', 'template', dto.to, { subject: dto.subject });
    return result;
  }

  @Get()
  findAll(@Query('includeVariants') includeVariants?: string) {
    return this.templatesService.findAll(includeVariants === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const updated = await this.templatesService.update(id, dto, tx);
      await this.auditLog.record(user, 'template.update', 'template', id, { fields: Object.keys(dto) }, tx);
      return updated;
    });
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.templatesService.remove(id, tx);
      await this.auditLog.record(user, 'template.delete', 'template', id, undefined, tx);
      return result;
    });
  }

  @Patch(':id/variant')
  @Roles('owner', 'editor')
  async setVariant(
    @Param('id') id: string,
    @Body('parentTemplateId') parentTemplateId: string | null,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.drizzle.db.transaction(async (tx) => {
      const updated = await this.templatesService.setVariant(id, parentTemplateId ?? null, tx);
      await this.auditLog.record(user, 'template.set_variant', 'template', id, { parentTemplateId: parentTemplateId ?? null }, tx);
      return updated;
    });
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.templatesService.listVersions(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id/variants')
  listVariants(@Param('id') id: string) {
    return this.templatesService.findVariants(id);
  }
}
