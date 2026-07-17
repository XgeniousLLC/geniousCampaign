import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ContactsService } from '../contacts/contacts.service';
import { ListsService } from '../lists/lists.service';
import { TagsService } from '../tags/tags.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { CurrentApiKey, type AuthenticatedApiKey } from '../api-keys/current-api-key.decorator';
import { CreatePublicContactDto } from './dto/create-public-contact.dto';

// External-facing surface for form/automation tools (Zapier, a website
// contact form, a custom script) to push a contact in — auth is the bearer
// key from Settings > Webhooks > API keys, not a user's JWT. Distinct from
// the HMAC-signed inbound webhook framework (CLAUDE.md invariant 4): that's
// a generic payload-relay + trigger-firing mechanism, this is a purpose-
// built "create a contact" REST endpoint with a simpler auth story that's
// easier for arbitrary external tools to call (a static header value,
// no per-request signature to compute).
@Controller('api/v1')
@UseGuards(ApiKeyAuthGuard)
export class PublicApiController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly lists: ListsService,
    private readonly tags: TagsService,
  ) {}

  @Post('contacts')
  async createContact(@Body() dto: CreatePublicContactDto, @CurrentApiKey() apiKey: AuthenticatedApiKey) {
    const contact = await this.contacts.upsertByEmail(dto.email, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields: dto.customFields,
    });

    // dto.listId/dto.tagIds are external-caller input and validated here
    // (404s on a bad id) — apiKey.defaultListId/defaultTagIds were already
    // validated once, at key-creation time (ApiKeysService.create), so
    // they're trusted as-is.
    const listId = dto.listId ?? apiKey.defaultListId ?? undefined;
    if (listId) {
      if (dto.listId) await this.lists.findOne(dto.listId);
      await this.lists.addContactSilent(listId, contact.id);
    }

    const defaultTagIds = (apiKey.defaultTagIds as string[]) ?? [];
    const tagIds = [...new Set([...(dto.tagIds ?? []), ...defaultTagIds])];
    for (const tagId of dto.tagIds ?? []) await this.tags.findOne(tagId);
    for (const tagId of tagIds) {
      await this.tags.addContactSilent(tagId, contact.id);
    }

    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      status: contact.status,
      listId: listId ?? null,
      tagIds,
    };
  }
}
