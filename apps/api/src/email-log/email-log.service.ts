import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sends, emailEvents, contacts, type sendStatusEnum } from '../db/schema';

export interface EmailLogFilter {
  status?: (typeof sendStatusEnum.enumValues)[number];
  campaignId?: string;
  sequenceId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class EmailLogService {
  constructor(private readonly drizzle: DrizzleService) {}

  async list(filter: EmailLogFilter) {
    const conditions = [
      filter.status ? eq(sends.status, filter.status) : undefined,
      filter.campaignId ? eq(sends.campaignId, filter.campaignId) : undefined,
      filter.sequenceId ? eq(sends.sequenceId, filter.sequenceId) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const offset = (page - 1) * limit;

    const [data, [{ count }]] = await Promise.all([
      this.drizzle.db.select().from(sends).where(where).orderBy(desc(sends.createdAt)).limit(limit).offset(offset),
      this.drizzle.db.select({ count: sql<number>`count(*)::int` }).from(sends).where(where),
    ]);
    return { data, total: count, page, limit };
  }

  /** The detail drawer's data: the send row itself (real resolved
   * subject/body, per GC-060's acceptance criterion — never the live
   * template) plus its real event history, plus the recipient email for
   * resending (GC-132). */
  async getDetail(sendId: string) {
    const [row] = await this.drizzle.db
      .select({ send: sends, contactEmail: contacts.email })
      .from(sends)
      .leftJoin(contacts, eq(sends.contactId, contacts.id))
      .where(eq(sends.id, sendId));
    if (!row) throw new NotFoundException(`Send ${sendId} not found`);

    const events = await this.drizzle.db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.sendId, sendId))
      .orderBy(desc(emailEvents.createdAt));

    return {
      send: row.send,
      recipientEmail: row.contactEmail || '',
      events,
    };
  }
}
