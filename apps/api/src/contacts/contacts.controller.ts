import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ContactsService, type ContactsPageQuery } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkDeleteContactsDto } from './dto/bulk-delete-contacts.dto';

const CONTACT_STATUS_VALUES = ['active', 'unsubscribed', 'bounced', 'suppressed'] as const;
const SORT_KEYS = ['name', 'status', 'lastActivityAt'] as const;

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
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
      sortKey: SORT_KEYS.includes(sortKeyRaw as (typeof SORT_KEYS)[number]) ? (sortKeyRaw as ContactsPageQuery['sortKey']) : undefined,
      sortDir: sortDirRaw === 'desc' ? 'desc' : sortDirRaw === 'asc' ? 'asc' : undefined,
    };
    return this.contactsService.findAllPaged(query);
  }

  // Declared before ':id' — 'bulk-delete' would otherwise never be reached
  // if a param route matched first, though Nest resolves POST vs GET/DELETE
  // separately either way; kept here for readability alongside the other
  // literal-path route.
  @Post('bulk-delete')
  bulkRemove(@Body() dto: BulkDeleteContactsDto) {
    return this.contactsService.bulkRemove(dto.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
