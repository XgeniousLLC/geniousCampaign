import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sends, emailEvents, type sendStatusEnum } from '../db/schema';

export interface EmailLogFilter {
  status?: (typeof sendStatusEnum.enumValues)[number];
  campaignId?: string;
  sequenceId?: string;
  limit?: number;
  offset?: number;
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

    return this.drizzle.db
      .select()
      .from(sends)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sends.createdAt))
      .limit(filter.limit ?? 50)
      .offset(filter.offset ?? 0);
  }

  /** The detail drawer's data: the send row itself (real resolved
   * subject/body, per GC-060's acceptance criterion — never the live
   * template) plus its real event history. */
  async getDetail(sendId: string) {
    const send = await this.drizzle.db.query.sends.findFirst({ where: eq(sends.id, sendId) });
    if (!send) throw new NotFoundException(`Send ${sendId} not found`);

    const events = await this.drizzle.db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.sendId, sendId))
      .orderBy(desc(emailEvents.createdAt));

    return { send, events };
  }
}
