import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { apiKeys } from '../db/schema';
import { generateApiKey } from './api-key.util';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ListsService } from '../lists/lists.service';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly lists: ListsService,
    private readonly tags: TagsService,
  ) {}

  /** The raw key is only ever returned here, at creation time — every other
   * read (findAll, the auth guard's lookup) only ever sees the hash.
   * defaultListId/defaultTagIds are validated here (a typo'd id would
   * otherwise only surface as a foreign-key error on the first real public
   * API call using this key, long after creation). */
  async create(dto: CreateApiKeyDto, actor: AuthenticatedUser) {
    if (dto.defaultListId) await this.lists.findOne(dto.defaultListId);
    for (const tagId of dto.defaultTagIds ?? []) await this.tags.findOne(tagId);

    const { raw, prefix, hash } = generateApiKey();
    const [created] = await this.drizzle.db
      .insert(apiKeys)
      .values({
        name: dto.name,
        keyPrefix: prefix,
        keyHash: hash,
        defaultListId: dto.defaultListId,
        defaultTagIds: dto.defaultTagIds ?? [],
        createdByUserId: actor.id,
      })
      .returning();
    return { ...created, key: raw };
  }

  findAll() {
    return this.drizzle.db.query.apiKeys.findMany({
      orderBy: (k, { desc }) => desc(k.createdAt),
      columns: { keyHash: false },
    });
  }

  async remove(id: string) {
    const existing = await this.drizzle.db.query.apiKeys.findFirst({ where: eq(apiKeys.id, id) });
    if (!existing) {
      throw new NotFoundException(`API key ${id} not found`);
    }
    await this.drizzle.db.delete(apiKeys).where(eq(apiKeys.id, id));
    return { id };
  }

  /** Used by ApiKeyAuthGuard — the only lookup path that ever touches
   * keyHash. Looks up by the sha256 of the raw key presented in the
   * request, never the raw key itself. */
  async findByHash(hash: string) {
    return this.drizzle.db.query.apiKeys.findFirst({ where: eq(apiKeys.keyHash, hash) });
  }

  async touchLastUsed(id: string) {
    await this.drizzle.db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }
}
