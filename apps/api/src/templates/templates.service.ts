import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { DbOrTx } from '../db/types';
import {
  templates,
  templateVersions,
  sends,
  emailEvents,
  sequenceStepTemplates,
  sequenceSteps,
} from '../db/schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import {
  renderBodyHtml,
  renderBodyText,
  resolvePersonalization,
  resolveSpintax,
  type ProseMirrorNode,
} from '@genius-campaign/shared';
import { SendDispatcherService } from '../sending/send-dispatcher.service';

// Sample data a test send resolves {{contact.x}} tokens against — there's
// no real contact behind a test send, so this stands in to show what an
// actual recipient's resolved copy would look like.
const SAMPLE_CONTACT = {
  firstName: 'Alex',
  lastName: 'Doe',
  email: 'alex@example.com',
};

@Injectable()
export class TemplatesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly sendDispatcher: SendDispatcherService,
  ) {}

  async create(dto: CreateTemplateDto, db: DbOrTx = this.drizzle.db) {
    const bodyJson = dto.bodyJson as unknown as ProseMirrorNode;
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const subjectLines = dto.subjectLines;
    const previewTextLines = dto.previewTextLines ?? [];

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(templates)
        .values({
          name: dto.name,
          subjectLines,
          previewTextLines,
          bodyJson: dto.bodyJson,
          bodyHtml,
          bodyText,
          folder: dto.folder,
        })
        .returning();

      await tx.insert(templateVersions).values({
        templateId: created.id,
        versionNumber: 1,
        name: created.name,
        subjectLines: created.subjectLines,
        previewTextLines: created.previewTextLines,
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
   * tables. */
  async findAll() {
    const templateRows = await this.drizzle.db.query.templates.findMany({
      orderBy: (t, { desc }) => desc(t.updatedAt),
    });

    const useRows = await this.drizzle.db
      .select({
        templateId: sends.templateId,
        uses: sql<number>`count(*) filter (where ${sends.status} = 'sent')`.mapWith(
          Number,
        ),
      })
      .from(sends)
      .groupBy(sends.templateId);
    const usesByTemplate = new Map(useRows.map((r) => [r.templateId, r.uses]));

    const openRows = await this.drizzle.db
      .select({
        templateId: sends.templateId,
        opens: sql<number>`count(distinct ${emailEvents.sendId})`.mapWith(
          Number,
        ),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(eq(emailEvents.type, 'open'))
      .groupBy(sends.templateId);
    const opensByTemplate = new Map(
      openRows.map((r) => [r.templateId, r.opens]),
    );

    // Distinct sequences a template is wired into as a step — separate from
    // "uses" (actual sent count) since a template can sit in a sequence step
    // and never have fired a send yet. A step can link several templates
    // (sequenceStepTemplates), so join through it to reach sequenceId.
    const usedInRows = await this.drizzle.db
      .select({
        templateId: sequenceStepTemplates.templateId,
        usedInCount:
          sql<number>`count(distinct ${sequenceSteps.sequenceId})`.mapWith(
            Number,
          ),
      })
      .from(sequenceStepTemplates)
      .innerJoin(
        sequenceSteps,
        eq(sequenceStepTemplates.sequenceStepId, sequenceSteps.id),
      )
      .groupBy(sequenceStepTemplates.templateId);
    const usedInByTemplate = new Map(
      usedInRows.map((r) => [r.templateId, r.usedInCount]),
    );

    return templateRows.map((t) => {
      const uses = usesByTemplate.get(t.id) ?? 0;
      const opens = opensByTemplate.get(t.id) ?? 0;
      return {
        ...t,
        uses,
        openRatePct: uses > 0 ? (opens / uses) * 100 : 0,
        usedInCount: usedInByTemplate.get(t.id) ?? 0,
      };
    });
  }

  async findOne(id: string, db: DbOrTx = this.drizzle.db) {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, id),
    });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async update(
    id: string,
    dto: UpdateTemplateDto,
    db: DbOrTx = this.drizzle.db,
  ) {
    const existing = await this.findOne(id, db);

    const name = dto.name ?? existing.name;
    const subjectLines = dto.subjectLines ?? existing.subjectLines;
    const previewTextLines = dto.previewTextLines ?? existing.previewTextLines;
    const bodyJson =
      (dto.bodyJson as unknown as ProseMirrorNode) ??
      (existing.bodyJson as unknown as ProseMirrorNode);
    const bodyHtml = renderBodyHtml(bodyJson);
    const bodyText = renderBodyText(bodyJson);
    const folder = dto.folder ?? existing.folder;

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(templates)
        .set({
          name,
          subjectLines,
          previewTextLines,
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
        subjectLines: updated.subjectLines,
        previewTextLines: updated.previewTextLines,
        bodyJson: updated.bodyJson,
        bodyHtml: updated.bodyHtml,
        bodyText: updated.bodyText,
      });

      return updated;
    });
  }

  async remove(id: string, db: DbOrTx = this.drizzle.db) {
    await this.findOne(id, db);
    await db.delete(templates).where(eq(templates.id, id));
    return { id };
  }

  async removeBulk(ids: string[], db: DbOrTx = this.drizzle.db) {
    if (ids.length === 0) return { deletedCount: 0 };
    await db.delete(templates).where(inArray(templates.id, ids));
    return { deletedCount: ids.length };
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

  /** Sends real content straight from the editor (not a saved template row —
   * testing while iterating shouldn't require saving first) to an arbitrary
   * address the admin chose. Personalization tokens resolve against sample
   * data before spintax, same order as a real send (invariant 5). No `sends`
   * row is written and suppression isn't checked — this isn't a send to a
   * contact, it's an ad-hoc QA action against an address the caller picked
   * themselves; SendDispatcherService still enforces real sender quota and
   * the circuit breaker, so it can't be used to bypass either. */
  async sendTestEmail(dto: SendTestEmailDto) {
    const resolvedSubject = resolveSpintax(
      resolvePersonalization(dto.subject, SAMPLE_CONTACT),
    );
    const resolvedHtml = resolveSpintax(
      resolvePersonalization(dto.bodyHtml, SAMPLE_CONTACT),
    );
    const resolvedText = resolveSpintax(
      resolvePersonalization(dto.bodyText, SAMPLE_CONTACT),
    );

    const result = await this.sendDispatcher.send({
      to: dto.to,
      subject: `[Test] ${resolvedSubject}`,
      html: resolvedHtml,
      text: resolvedText,
      unsubscribeUrl: '#',
    });

    return { sent: true, provider: result.provider };
  }
}
