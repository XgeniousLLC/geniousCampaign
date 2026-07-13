import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkDeleteContactsDto } from './dto/bulk-delete-contacts.dto';

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
