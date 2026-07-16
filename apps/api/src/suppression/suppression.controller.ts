import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
  listAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.suppression.listAll(page ? parseInt(page, 10) : undefined, limit ? parseInt(limit, 10) : undefined);
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

  // Same suppression_list gate as manual suppress (still blocks future
  // sends per CLAUDE.md invariant 8), but marks the contact 'unsubscribed'
  // rather than 'suppressed' — the status the contacts filter already
  // exposes but nothing previously set.
  @Post('unsubscribe')
  async manualUnsubscribe(@Body() dto: ManualSuppressDto) {
    const contact = await this.contactsService.findOne(dto.contactId);
    await this.suppression.suppress(contact.email, 'manual_unsubscribe', 'admin_ui');
    return this.contactsService.update(dto.contactId, { status: 'unsubscribed' });
  }
}
