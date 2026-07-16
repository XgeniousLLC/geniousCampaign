import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { aiUsage } from '../db/schema';
import { estimateCostUsd } from './model-pricing';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /** Never let usage tracking take down a real generate() call — same
   * best-effort shape as DebugLogService.record(). */
  async record(provider: string, model: string, promptTokens: number, completionTokens: number) {
    try {
      const costUsd = estimateCostUsd(model, promptTokens, completionTokens);
      await this.drizzle.db.insert(aiUsage).values({ provider, model, promptTokens, completionTokens, costUsd });
    } catch (err) {
      this.logger.warn(`Failed to record AI usage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getSummary() {
    const byModel = await this.drizzle.db
      .select({
        provider: aiUsage.provider,
        model: aiUsage.model,
        calls: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::int`,
        costUsd: sql<number | null>`sum(${aiUsage.costUsd})`,
      })
      .from(aiUsage)
      .groupBy(aiUsage.provider, aiUsage.model)
      .orderBy(sql`sum(${aiUsage.costUsd}) desc nulls last`);

    const totals = byModel.reduce(
      (acc, row) => ({
        calls: acc.calls + row.calls,
        promptTokens: acc.promptTokens + row.promptTokens,
        completionTokens: acc.completionTokens + row.completionTokens,
        costUsd: row.costUsd === null ? acc.costUsd : acc.costUsd + row.costUsd,
        hasUnknownCost: acc.hasUnknownCost || row.costUsd === null,
      }),
      { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, hasUnknownCost: false },
    );

    return { totals, byModel };
  }
}
