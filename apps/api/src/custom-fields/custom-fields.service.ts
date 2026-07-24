import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { customFieldDefs } from '../db/schema';
import { CreateCustomFieldDefDto } from './dto/create-custom-field-def.dto';

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function labelFromKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

@Injectable()
export class CustomFieldsService {
  constructor(private readonly drizzle: DrizzleService) {}

  findAll() {
    return this.drizzle.db.query.customFieldDefs.findMany({ orderBy: (f, { asc }) => asc(f.createdAt) });
  }

  async create(dto: CreateCustomFieldDefDto) {
    const key = dto.key?.trim() ? slugify(dto.key) : slugify(dto.label);
    if (!key) {
      throw new ConflictException('Could not derive a valid field key from the label.');
    }

    const existing = await this.drizzle.db.query.customFieldDefs.findFirst({ where: eq(customFieldDefs.key, key) });
    if (existing) {
      throw new ConflictException(`A custom field with key "${key}" already exists.`);
    }

    const [created] = await this.drizzle.db
      .insert(customFieldDefs)
      .values({
        key,
        label: dto.label.trim(),
        inputType: dto.inputType,
        options: dto.inputType === 'select' ? dto.options : null,
      })
      .returning();
    return created;
  }

  // Used by the public API's contact upsert (CLAUDE.md invariant 14): each
  // incoming custom-field slug either matches an existing def or gets one
  // auto-created (inputType 'text', label derived from the key) so the value
  // has somewhere to attach. onConflictDoNothing + re-query, not a
  // find-then-throw — two concurrent requests introducing the same new slug
  // must both succeed, not 409 each other.
  async getOrCreateByKey(rawKey: string) {
    const key = slugify(rawKey);
    if (!key) {
      throw new ConflictException(`Could not derive a valid custom field key from "${rawKey}".`);
    }

    const existing = await this.drizzle.db.query.customFieldDefs.findFirst({ where: eq(customFieldDefs.key, key) });
    if (existing) {
      return existing;
    }

    const [created] = await this.drizzle.db
      .insert(customFieldDefs)
      .values({ key, label: labelFromKey(key), inputType: 'text' })
      .onConflictDoNothing({ target: customFieldDefs.key })
      .returning();
    if (created) {
      return created;
    }

    // Lost the create race to a concurrent request — the row exists now.
    const afterRace = await this.drizzle.db.query.customFieldDefs.findFirst({ where: eq(customFieldDefs.key, key) });
    if (!afterRace) {
      throw new ConflictException(`Failed to get or create custom field "${key}".`);
    }
    return afterRace;
  }

  async remove(id: string) {
    const existing = await this.drizzle.db.query.customFieldDefs.findFirst({ where: eq(customFieldDefs.id, id) });
    if (!existing) {
      throw new NotFoundException(`Custom field ${id} not found`);
    }
    await this.drizzle.db.delete(customFieldDefs).where(eq(customFieldDefs.id, id));
    return { id };
  }
}
