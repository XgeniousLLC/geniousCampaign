import { Injectable } from '@nestjs/common';
import { and, eq, gte, sql, desc, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sends, emailEvents, campaigns } from '../db/schema';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getOverview(days = 30) {
    const since = daysAgo(days);

    const [sendStats] = await this.drizzle.db
      .select({
        sentCount: sql<number>`count(*) filter (where ${sends.status} in ('sent'))`.mapWith(Number),
        failedCount: sql<number>`count(*) filter (where ${sends.status} = 'failed')`.mapWith(Number),
        bouncedCount: sql<number>`count(*) filter (where ${sends.status} = 'bounced')`.mapWith(Number),
        complainedCount: sql<number>`count(*) filter (where ${sends.status} = 'complained')`.mapWith(Number),
        suppressedCount: sql<number>`count(*) filter (where ${sends.status} = 'suppressed')`.mapWith(Number),
        totalCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(sends)
      .where(gte(sends.createdAt, since));

    const [eventStats] = await this.drizzle.db
      .select({
        openCount: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(Number),
        clickCount: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'click')`.mapWith(Number),
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .where(gte(sends.createdAt, since));

    const sentCount = sendStats?.sentCount ?? 0;
    const openCount = eventStats?.openCount ?? 0;
    const clickCount = eventStats?.clickCount ?? 0;

    return {
      sentCount,
      failedCount: sendStats?.failedCount ?? 0,
      bouncedCount: sendStats?.bouncedCount ?? 0,
      complainedCount: sendStats?.complainedCount ?? 0,
      suppressedCount: sendStats?.suppressedCount ?? 0,
      totalCount: sendStats?.totalCount ?? 0,
      openCount,
      clickCount,
      openRatePct: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
      clickRatePct: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
      bounceRatePct: sentCount > 0 ? ((sendStats?.bouncedCount ?? 0) / sentCount) * 100 : 0,
    };
  }

  /** Daily open/click counts for the engagement-over-time chart — a real
   * group-by-date query, not synthetic data. */
  async getEngagementTrend(days = 30) {
    const since = daysAgo(days);
    const rows = await this.drizzle.db
      .select({
        date: sql<string>`date(${emailEvents.createdAt})`.mapWith(String),
        type: emailEvents.type,
        count: sql<number>`count(distinct ${emailEvents.sendId})`.mapWith(Number),
      })
      .from(emailEvents)
      .where(and(gte(emailEvents.createdAt, since), inArray(emailEvents.type, ['open', 'click'])))
      .groupBy(sql`date(${emailEvents.createdAt})`, emailEvents.type)
      .orderBy(sql`date(${emailEvents.createdAt})`);

    const byDate = new Map<string, { date: string; opens: number; clicks: number }>();
    for (const row of rows) {
      const entry = byDate.get(row.date) ?? { date: row.date, opens: 0, clicks: 0 };
      if (row.type === 'open') entry.opens = row.count;
      if (row.type === 'click') entry.clicks = row.count;
      byDate.set(row.date, entry);
    }
    return Array.from(byDate.values());
  }

  async getRecentCampaigns(limit = 5) {
    const recentCampaigns = await this.drizzle.db.query.campaigns.findMany({
      orderBy: (c, { desc: d }) => d(c.createdAt),
      limit,
    });

    return Promise.all(
      recentCampaigns.map(async (campaign) => {
        const [eventStats] = await this.drizzle.db
          .select({
            openCount: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'open')`.mapWith(Number),
            clickCount: sql<number>`count(distinct ${emailEvents.sendId}) filter (where ${emailEvents.type} = 'click')`.mapWith(Number),
          })
          .from(emailEvents)
          .innerJoin(sends, eq(emailEvents.sendId, sends.id))
          .where(eq(sends.campaignId, campaign.id));

        return {
          ...campaign,
          openCount: eventStats?.openCount ?? 0,
          clickCount: eventStats?.clickCount ?? 0,
        };
      }),
    );
  }

  /** Real recent open/click events joined with the send's campaign name,
   * for the dashboard's activity feed. */
  async getRecentActivity(limit = 10) {
    return this.drizzle.db
      .select({
        id: emailEvents.id,
        type: emailEvents.type,
        url: emailEvents.url,
        createdAt: emailEvents.createdAt,
        sendId: sends.id,
        campaignName: campaigns.name,
      })
      .from(emailEvents)
      .innerJoin(sends, eq(emailEvents.sendId, sends.id))
      .leftJoin(campaigns, eq(sends.campaignId, campaigns.id))
      .orderBy(desc(emailEvents.createdAt))
      .limit(limit);
  }
}
