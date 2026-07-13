import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { DrizzleService } from '../db/drizzle.service';

@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const created = await this.tagsService.create(dto, tx);
      await this.auditLog.record(user, 'tag.create', 'tag', created.id, { name: created.name }, tx);
      return created;
    });
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const updated = await this.tagsService.update(id, dto, tx);
      await this.auditLog.record(user, 'tag.update', 'tag', id, { fields: Object.keys(dto) }, tx);
      return updated;
    });
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.tagsService.remove(id, tx);
      await this.auditLog.record(user, 'tag.delete', 'tag', id, undefined, tx);
      return result;
    });
  }

  @Get(':id/contacts')
  listContacts(@Param('id') id: string) {
    return this.tagsService.listContacts(id);
  }

  @Post(':id/contacts/:contactId')
  @Roles('owner', 'editor')
  addContact(@Param('id') id: string, @Param('contactId') contactId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.tagsService.addContact(id, contactId, tx);
      await this.auditLog.record(user, 'tag.contact.add', 'tag', id, { contactId }, tx);
      return result;
    });
  }

  @Delete(':id/contacts/:contactId')
  @Roles('owner', 'editor')
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.tagsService.removeContact(id, contactId, tx);
      await this.auditLog.record(user, 'tag.contact.remove', 'tag', id, { contactId }, tx);
      return result;
    });
  }
}
