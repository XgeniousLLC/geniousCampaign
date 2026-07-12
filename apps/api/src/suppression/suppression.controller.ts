import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuppressionService } from './suppression.service';
import { ContactsService } from '../contacts/contacts.service';
import { ManualSuppressDto } from './dto/manual-suppress.dto';

@Controller('suppression-list')
@UseGuards(JwtAuthGuard)
export class SuppressionController {
  constructor(
    private readonly suppression: SuppressionService,
    private readonly contactsService: ContactsService,
  ) {}

  @Get()
  listAll() {
    return this.suppression.listAll();
  }

  // Manual suppress from the contacts admin UI — adds to the real
  // suppression_list (what SendDispatcherService actually checks, per
  // CLAUDE.md invariant 8) and mirrors the contact's own status field so
  // the contacts list filter/badge stay in sync.
  @Post('manual')
  async manualSuppress(@Body() dto: ManualSuppressDto) {
    const contact = await this.contactsService.findOne(dto.contactId);
    await this.suppression.suppress(contact.email, 'manual_unsubscribe', 'admin_ui');
    return this.contactsService.update(dto.contactId, { status: 'suppressed' });
  }
}
