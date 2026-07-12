import { Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { suppressionList, softBounceCounts, type suppressionReasonEnum } from '../db/schema';
import { OutboundWebhookDispatchService } from '../outbound-webhooks/outbound-webhook-dispatch.service';

const SOFT_BOUNCE_THRESHOLD = 3;

type SuppressionReason = (typeof suppressionReasonEnum.enumValues)[number];

const REASON_TO_EVENT: Record<SuppressionReason, string> = {
  hard_bounce: 'email.bounced',
  repeated_soft_bounce: 'email.bounced',
  complaint: 'email.complained',
  manual_unsubscribe: 'email.unsubscribed',
};

@Injectable()
export class SuppressionService {
  private readonly logger = new Logger(SuppressionService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly outboundWebhooks: OutboundWebhookDispatchService,
  ) {}

  async isSuppressed(email: string): Promise<boolean> {
    const row = await this.drizzle.db.query.suppressionList.findFirst({ where: eq(suppressionList.email, email) });
    return !!row;
  }

  async suppress(email: string, reason: SuppressionReason, source: string) {
    const existing = await this.drizzle.db.query.suppressionList.findFirst({
      where: eq(suppressionList.email, email),
    });
    if (existing) return existing;

    const [created] = await this.drizzle.db.insert(suppressionList).values({ email, reason, source }).returning();
    this.logger.log(`Suppressed ${email} (${reason}, source=${source})`);
    await this.outboundWebhooks.emit(REASON_TO_EVENT[reason], { email, reason, source });
    return created;
  }

  async recordSoftBounce(email: string, source: string) {
    const existing = await this.drizzle.db.query.softBounceCounts.findFirst({
      where: eq(softBounceCounts.email, email),
    });

    if (!existing) {
      await this.drizzle.db.insert(softBounceCounts).values({ email, count: 1 });
      return { count: 1, suppressed: false };
    }

    const [updated] = await this.drizzle.db
      .update(softBounceCounts)
      .set({ count: sql`${softBounceCounts.count} + 1`, lastBouncedAt: new Date() })
      .where(eq(softBounceCounts.id, existing.id))
      .returning();

    if (updated.count >= SOFT_BOUNCE_THRESHOLD) {
      await this.suppress(email, 'repeated_soft_bounce', source);
      return { count: updated.count, suppressed: true };
    }
    return { count: updated.count, suppressed: false };
  }

  listAll() {
    return this.drizzle.db.query.suppressionList.findMany({ orderBy: (s, { desc }) => desc(s.createdAt) });
  }
}
