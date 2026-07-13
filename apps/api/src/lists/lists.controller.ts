import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { AuditLogService } from '../auth/audit-log.service';
import { DrizzleService } from '../db/drizzle.service';

@Controller('lists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ListsController {
  constructor(
    private readonly listsService: ListsService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const created = await this.listsService.create(dto, tx);
      await this.auditLog.record(user, 'list.create', 'list', created.id, { name: created.name }, tx);
      return created;
    });
  }

  @Get()
  findAll() {
    return this.listsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listsService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const updated = await this.listsService.update(id, dto, tx);
      await this.auditLog.record(user, 'list.update', 'list', id, { fields: Object.keys(dto) }, tx);
      return updated;
    });
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.listsService.remove(id, tx);
      await this.auditLog.record(user, 'list.delete', 'list', id, undefined, tx);
      return result;
    });
  }

  @Get(':id/contacts')
  listContacts(@Param('id') id: string) {
    return this.listsService.listContacts(id);
  }

  @Post(':id/contacts/:contactId')
  @Roles('owner', 'editor')
  addContact(@Param('id') id: string, @Param('contactId') contactId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.listsService.addContact(id, contactId, tx);
      await this.auditLog.record(user, 'list.contact.add', 'list', id, { contactId }, tx);
      return result;
    });
  }

  @Delete(':id/contacts/:contactId')
  @Roles('owner', 'editor')
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const result = await this.listsService.removeContact(id, contactId, tx);
      await this.auditLog.record(user, 'list.contact.remove', 'list', id, { contactId }, tx);
      return result;
    });
  }
}
