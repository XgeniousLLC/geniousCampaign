import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import { templates, templateVersions, sends, emailEvents } from '../db/schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { renderBodyHtml, renderBodyText, type ProseMirrorNode } from '@genius-campaign/shared';

@Injectable()
export class TemplatesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateTemplateDto, db: DbOrTx = this.drizzle.db) {
    const bodyJson = dto.bodyJson as unknown as ProseMirrorNode;
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const subject = dto.subject ?? '';

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(templates)
        .values({
          name: dto.name,
          subject,
          bodyJson: dto.bodyJson,
          bodyHtml,
          bodyText,
          folder: dto.folder,
          parentTemplateId: dto.parentTemplateId,
        })
        .returning();

      await tx.insert(templateVersions).values({
        templateId: created.id,
        versionNumber: 1,
        name: created.name,
        subject: created.subject,
        bodyJson: created.bodyJson,
        bodyHtml: created.bodyHtml,
        bodyText: created.bodyText,
      });

      return created;
    });
  }

  /** Templates list screen needs per-template "uses" (sent count) and open
   * rate — computed here rather than stored, since they change as sends/opens
   * come in and would otherwise drift out of sync with the sends/email_events
   * tables.
   *
   * Saved shuffle/AI variants are real template rows (sendable, have their
   * own uses/open-rate) but are hidden from this default list — they'd just
   * clutter it since they're not independent templates a user picks from
   * scratch. Pass includeVariants=true (campaign compose's picker) to get
   * everything, top-level and variants alike. */
  async findAll(includeVariants = false) {
    const templateRows = await this.drizzle.db.query.templates.findMany({
      where: includeVariants ? undefined : isNull(templates.parentTemplateId),
      orderBy: (t, { desc }) => desc(t.updatedAt),
    });

    const useRows = await this.drizzle.db
      .select({
        templateId: sends.templateId,
        uses: sql<number>`count(*) filter (where ${sends.status} = 'sent')`.mapWith(Number),
      })
      .from(sends)
      .groupBy(sends.templateId);
    const usesByTemplate = new Map(useRows.map((r) => [r.templateId, r.uses]));

    const openRows = await this.drizzle.db
      .select({
        templateId: sends.templateId,
        opens: sql<number>`count(distinct ${emailEvents.sendId})`.mapWith(Number),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(eq(emailEvents.type, 'open'))
      .groupBy(sends.templateId);
    const opensByTemplate = new Map(openRows.map((r) => [r.templateId, r.opens]));

    return templateRows.map((t) => {
      const uses = usesByTemplate.get(t.id) ?? 0;
      const opens = opensByTemplate.get(t.id) ?? 0;
      return { ...t, uses, openRatePct: uses > 0 ? (opens / uses) * 100 : 0 };
    });
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const template = await db.query.templates.findFirst({ where: eq(templates.id, id) });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, db: DbOrTx = this.drizzle.db) {
    const existing = await this.findOne(id, db);

    const name = dto.name ?? existing.name;
    const subject = dto.subject ?? existing.subject;
    const bodyJson = (dto.bodyJson as unknown as ProseMirrorNode) ?? (existing.bodyJson as unknown as ProseMirrorNode);
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const folder = dto.folder ?? existing.folder;

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(templates)
        .set({
          name,
          subject,
          bodyJson: bodyJson as unknown as Record<string, unknown>,
          bodyHtml,
          bodyText,
          folder,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, id))
        .returning();

      const [lastVersion] = await tx
        .select({ versionNumber: templateVersions.versionNumber })
        .from(templateVersions)
        .where(eq(templateVersions.templateId, id))
        .orderBy(desc(templateVersions.versionNumber))
        .limit(1);

      await tx.insert(templateVersions).values({
        templateId: id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        name: updated.name,
        subject: updated.subject,
        bodyJson: updated.bodyJson,
        bodyHtml: updated.bodyHtml,
        bodyText: updated.bodyText,
      });

      return updated;
    });
  }

  async findVariants(parentId: string) {
    await this.findOne(parentId);
    return this.drizzle.db.query.templates.findMany({
      where: eq(templates.parentTemplateId, parentId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(templates).where(eq(templates.id, id));
    return { id };
  }

  async listVersions(id: string, limit = 20) {
    await this.findOne(id);
    return this.drizzle.db
      .select()
      .from(templateVersions)
      .where(and(eq(templateVersions.templateId, id)))
      .orderBy(desc(templateVersions.versionNumber))
      .limit(limit);
  }
}
