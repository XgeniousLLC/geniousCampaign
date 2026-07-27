import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ContactsService } from '../contacts/contacts.service';
import { ListsService } from '../lists/lists.service';
import { TagsService } from '../tags/tags.service';
import { EnrollmentService } from '../enrollments/enrollment.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { DrizzleService } from '../db/drizzle.service';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';
import { PublicApiThrottlerGuard } from './public-api-throttler.guard';
import { CurrentApiKey, type AuthenticatedApiKey } from '../api-keys/current-api-key.decorator';
import { CreatePublicContactDto } from './dto/create-public-contact.dto';
import { EnrollPublicContactDto } from './dto/enroll-public-contact.dto';
import { RemoveFromSequenceDto } from './dto/remove-from-sequence.dto';
import { RemoveFromListDto } from './dto/remove-from-list.dto';
import { RemoveTagsDto } from './dto/remove-tags.dto';
import { RemoveAllDto } from './dto/remove-all.dto';
import { contactTags, tags, contactLists, lists as listsTable, sequenceEnrollments, sequences, auditLog } from '../db/schema';

// External-facing surface for form/automation tools (Zapier, a website
// contact form, a custom script) to push a contact in — auth is the bearer
// key from Settings > API keys, not a user's JWT. Distinct from the
// HMAC-signed inbound webhook framework (CLAUDE.md invariant 4): that's a
// generic payload-relay + trigger-firing mechanism, this is a purpose-built
// "create a contact" REST endpoint with a simpler auth story that's easier
// for arbitrary external tools to call (a static header value, no
// per-request signature to compute).
// Throttler guard runs first so it also caps floods of invalid keys, not
// just valid ones (ApiKeyAuthGuard would otherwise 401 and short-circuit
// before any rate limit ever applied).
@Controller('api/v1')
@UseGuards(PublicApiThrottlerGuard, ApiKeyAuthGuard)
export class PublicApiController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly lists: ListsService,
    private readonly tags: TagsService,
    private readonly enrollments: EnrollmentService,
    private readonly customFields: CustomFieldsService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Post('contacts')
  async createContact(@Body() dto: CreatePublicContactDto, @CurrentApiKey() apiKey: AuthenticatedApiKey) {
    // Each customFields key is a custom-field slug: matched against an
    // existing custom_field_defs row if one exists, else a new def is
    // auto-created for it (CLAUDE.md invariant 14) — the value then lands in
    // contacts.customFields keyed by the def's canonical (slugified) key,
    // same as if an admin had defined the field first via Settings.
    let customFields: Record<string, unknown> | undefined;
    if (dto.customFields) {
      customFields = {};
      for (const [rawKey, value] of Object.entries(dto.customFields)) {
        const def = await this.customFields.getOrCreateByKey(rawKey);
        customFields[def.key] = value;
      }
    }

    const contact = await this.contacts.upsertByEmail(dto.email, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      customFields,
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

  // Returns the full contact profile — tags, lists, and sequence enrollments
  // — so an external tool can inspect a contact and then remove it from one
  // or more of those associations using the sibling remove-* endpoints.
  // Contact must already exist (404 if not).
  @Get('contacts/:email')
  async getContact(@Param('email') email: string) {
    const contact = await this.contacts.findByEmail(email);

    const [tagRows, listRows, enrollmentRows] = await Promise.all([
      this.drizzle.db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(eq(contactTags.contactId, contact.id)),
      this.drizzle.db
        .select({ id: listsTable.id, name: listsTable.name })
        .from(contactLists)
        .innerJoin(listsTable, eq(contactLists.listId, listsTable.id))
        .where(eq(contactLists.contactId, contact.id)),
      this.drizzle.db
        .select({
          sequenceId: sequenceEnrollments.sequenceId,
          sequenceName: sequences.name,
          status: sequenceEnrollments.status,
          enrolledAt: sequenceEnrollments.enrolledAt,
        })
        .from(sequenceEnrollments)
        .innerJoin(sequences, eq(sequenceEnrollments.sequenceId, sequences.id))
        .where(eq(sequenceEnrollments.contactId, contact.id)),
    ]);

    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      status: contact.status,
      customFields: contact.customFields,
      tags: tagRows,
      lists: listRows,
      sequences: enrollmentRows,
    };
  }

  // Enrolls an existing contact into a sequence — reuses EnrollmentService.enroll()
  // unchanged (invariant 2), so this is the identical state transition the
  // admin UI and inbound webhook controller trigger, just reached via a
  // bearer API key instead of a JWT session or HMAC signature. Contact must
  // already exist (404 if not) — this endpoint never creates one as a side
  // effect. EnrollmentService itself 404s on an unknown sequenceId and 409s
  // if the contact already has an active/paused enrollment in it.
  @Post('contacts/:email/enroll')
  async enroll(@Param('email') email: string, @Body() dto: EnrollPublicContactDto) {
    const contact = await this.contacts.findByEmail(email);
    const enrollment = await this.enrollments.enroll(dto.sequenceId, contact.id);
    return {
      enrollmentId: enrollment.id,
      contactId: contact.id,
      email: contact.email,
      sequenceId: enrollment.sequenceId,
      status: enrollment.status,
      currentStepId: enrollment.currentStepId,
    };
  }

  // Stops every active/paused sequence enrollment for the contact with this
  // email, across all sequences — enrollment has no shared sequence-wide
  // clock (invariant 1), so this is a lookup-by-email + stopAllForContact,
  // not a single row flip. Contact must already exist (404 if not) — this
  // endpoint stops enrollments, it never creates a contact as a side effect.
  @Post('contacts/:email/stop-sequences')
  async stopSequences(@Param('email') email: string) {
    const contact = await this.contacts.findByEmail(email);
    const stopped = await this.enrollments.stopAllForContact(contact.id);
    return {
      contactId: contact.id,
      email: contact.email,
      stopped: stopped.map((e) => ({ enrollmentId: e.id, sequenceId: e.sequenceId })),
    };
  }

  // Removes the contact from a specific sequence enrollment (stops it) with
  // an optional reason logged to the audit trail. Uses the same
  // EnrollmentService.stop() as the admin and webhook controllers (invariant
  // 2). Contact must already exist (404 if not). No-op if the contact is
  // already stopped/completed in this sequence (409).
  @Post('contacts/:email/remove-sequence')
  async removeFromSequence(
    @Param('email') email: string,
    @Body() dto: RemoveFromSequenceDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ) {
    const contact = await this.contacts.findByEmail(email);
    const enrollment = await this.enrollments.findActiveForContactInSequence(dto.sequenceId, contact.id);
    const stopped = await this.enrollments.stop(enrollment.id);

    await this.drizzle.db.insert(auditLog).values({
      actorId: null,
      actorEmail: `api-key:${apiKey.name}`,
      action: 'public_api.remove_sequence',
      entityType: 'sequence_enrollment',
      entityId: stopped.id,
      metadata: { contactId: contact.id, sequenceId: dto.sequenceId, reason: dto.reason ?? null },
    });

    return {
      enrollmentId: stopped.id,
      contactId: contact.id,
      email: contact.email,
      sequenceId: dto.sequenceId,
      status: stopped.status,
    };
  }

  // Removes the contact from a list. Contact must already exist (404 if
  // not). The list must exist (404 if not). No error if the contact was not
  // in the list to begin with — the remove is idempotent.
  @Post('contacts/:email/remove-list')
  async removeFromList(@Param('email') email: string, @Body() dto: RemoveFromListDto) {
    const contact = await this.contacts.findByEmail(email);
    await this.lists.removeContact(dto.listId, contact.id);
    return {
      contactId: contact.id,
      email: contact.email,
      listId: dto.listId,
    };
  }

  // Removes one or more tags from a contact. Contact must already exist (404
  // if not). Each tag must exist (404 if any is unknown). No error if the
  // contact didn't have a given tag to begin with — the remove is idempotent
  // per tag.
  @Post('contacts/:email/remove-tags')
  async removeTags(@Param('email') email: string, @Body() dto: RemoveTagsDto) {
    const contact = await this.contacts.findByEmail(email);
    const removed: { tagId: string }[] = [];
    for (const tagId of dto.tagIds) {
      await this.tags.removeContact(tagId, contact.id);
      removed.push({ tagId });
    }
    return {
      contactId: contact.id,
      email: contact.email,
      removed,
    };
  }

  // Removes the contact from every list they're in and stops every
  // active/paused sequence enrollment — all in one call. Accepts an optional
  // reason that's logged to the audit trail for each stopped enrollment.
  // Contact must already exist (404 if not). Idempotent: if the contact has
  // no lists or no active enrollments, the matching arrays are simply empty.
  @Post('contacts/:email/remove-all')
  async removeAll(
    @Param('email') email: string,
    @Body() dto: RemoveAllDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
  ) {
    const contact = await this.contacts.findByEmail(email);

    const listMemberships = await this.drizzle.db
      .select({ listId: contactLists.listId })
      .from(contactLists)
      .where(eq(contactLists.contactId, contact.id));

    for (const { listId } of listMemberships) {
      await this.lists.removeContact(listId, contact.id);
    }

    const stopped = await this.enrollments.stopAllForContact(contact.id);

    for (const enrollment of stopped) {
      await this.drizzle.db.insert(auditLog).values({
        actorId: null,
        actorEmail: `api-key:${apiKey.name}`,
        action: 'public_api.remove_all_sequence',
        entityType: 'sequence_enrollment',
        entityId: enrollment.id,
        metadata: { contactId: contact.id, sequenceId: enrollment.sequenceId, reason: dto.reason ?? null },
      });
    }

    return {
      contactId: contact.id,
      email: contact.email,
      listsRemoved: listMemberships.length,
      sequencesStopped: stopped.length,
      stopped: stopped.map((e) => ({ enrollmentId: e.id, sequenceId: e.sequenceId })),
    };
  }
}
