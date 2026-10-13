import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ContactsService, type ContactsPageQuery } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkDeleteContactsDto } from './dto/bulk-delete-contacts.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const CONTACT_STATUS_VALUES = ['active', 'unsubscribed', 'bounced', 'suppressed'] as const;
const SORT_KEYS = ['name', 'status', 'lastActivityAt'] as const;

/** Repeated (`?listIds=a&listIds=b`) and comma-separated (`?listIds=a,b`)
 * params both arrive here — Nest gives a string for one occurrence, an
 * array for several. */
function parseIdList(raw?: string | string[]): string[] | undefined {
  if (!raw) return undefined;
  const ids = (Array.isArray(raw) ? raw : [raw]).flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles('owner', 'editor')
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get()
  findAll() {
    return this.contactsService.findAll();
  }

  // GC-118: the paginated/filterable view the Contacts admin page actually
  // uses — 'paged' rather than plain query params on GET /contacts so the
  // bare endpoint's "always the full array" contract (relied on by the
  // campaign compose/sequence builder/email log pickers) never changes
  // shape depending on which query params happen to be present.
  @Get('paged')
  findAllPaged(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
    @Query('status') statusRaw?: string,
    @Query('listId') listId?: string,
    @Query('listIds') listIdsRaw?: string | string[],
    @Query('tagIds') tagIdsRaw?: string | string[],
    @Query('sortKey') sortKeyRaw?: string,
    @Query('sortDir') sortDirRaw?: string,
  ) {
    const query: ContactsPageQuery = {
      page: pageRaw ? Number(pageRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
      search: search || undefined,
      status: CONTACT_STATUS_VALUES.includes(statusRaw as (typeof CONTACT_STATUS_VALUES)[number])
        ? (statusRaw as ContactsPageQuery['status'])
        : undefined,
      listId: listId || undefined,
      listIds: parseIdList(listIdsRaw),
      tagIds: parseIdList(tagIdsRaw),
      sortKey: SORT_KEYS.includes(sortKeyRaw as (typeof SORT_KEYS)[number]) ? (sortKeyRaw as ContactsPageQuery['sortKey']) : undefined,
      sortDir: sortDirRaw === 'desc' ? 'desc' : sortDirRaw === 'asc' ? 'asc' : undefined,
    };
    return this.contactsService.findAllPaged(query);
  }

  // Literal-path GET like 'paged' above — must stay before ':id' or the
  // param route swallows it. Exports the current filtered view (same
  // search/status/list/tag params), unpaginated.
  @Get('export')
  async exportFiltered(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('status') statusRaw?: string,
    @Query('listIds') listIdsRaw?: string | string[],
    @Query('tagIds') tagIdsRaw?: string | string[],
  ) {
    const { filename, csv } = await this.contactsService.exportFilteredCsv({
      search: search || undefined,
      status: CONTACT_STATUS_VALUES.includes(statusRaw as (typeof CONTACT_STATUS_VALUES)[number])
        ? (statusRaw as ContactsPageQuery['status'])
        : undefined,
      listIds: parseIdList(listIdsRaw),
      tagIds: parseIdList(tagIdsRaw),
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // Declared before ':id' — 'bulk-delete' would otherwise never be reached
  // if a param route matched first, though Nest resolves POST vs GET/DELETE
  // separately either way; kept here for readability alongside the other
  // literal-path route.
  @Post('bulk-delete')
  @Roles('owner', 'editor')
  bulkRemove(@Body() dto: BulkDeleteContactsDto) {
    return this.contactsService.bulkRemove(dto.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'editor')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
