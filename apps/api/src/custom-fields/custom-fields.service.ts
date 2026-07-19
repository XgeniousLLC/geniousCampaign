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

  async remove(id: string) {
    const existing = await this.drizzle.db.query.customFieldDefs.findFirst({ where: eq(customFieldDefs.id, id) });
    if (!existing) {
      throw new NotFoundException(`Custom field ${id} not found`);
    }
    await this.drizzle.db.delete(customFieldDefs).where(eq(customFieldDefs.id, id));
    return { id };
  }
}
