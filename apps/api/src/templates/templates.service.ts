import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { templates, templateVersions } from '../db/schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { renderBodyHtml, renderBodyText, type ProseMirrorNode } from '@genius-campaign/shared';

@Injectable()
export class TemplatesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateTemplateDto) {
    const bodyJson = dto.bodyJson as unknown as ProseMirrorNode;
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const subject = dto.subject ?? '';

    return this.drizzle.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(templates)
        .values({ name: dto.name, subject, bodyJson: dto.bodyJson, bodyHtml, bodyText, folder: dto.folder })
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

  findAll() {
    return this.drizzle.db.query.templates.findMany({ orderBy: (t, { desc }) => desc(t.updatedAt) });
  }

  async findOne(id: string) {
    const template = await this.drizzle.db.query.templates.findFirst({ where: eq(templates.id, id) });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.findOne(id);

    const name = dto.name ?? existing.name;
    const subject = dto.subject ?? existing.subject;
    const bodyJson = (dto.bodyJson as unknown as ProseMirrorNode) ?? (existing.bodyJson as unknown as ProseMirrorNode);
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const folder = dto.folder ?? existing.folder;

    return this.drizzle.db.transaction(async (tx) => {
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

  async remove(id: string) {
    await this.findOne(id);
    await this.drizzle.db.delete(templates).where(eq(templates.id, id));
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
