import { Injectable, Logger } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { errorLogs } from '../db/schema';
import type { CreateErrorLogDto } from './dto/create-error-log.dto';

@Injectable()
export class DebugLogService {
  private readonly logger = new Logger(DebugLogService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async record(dto: CreateErrorLogDto) {
    // Never let logging itself take the app down or block a response.
    try {
      await this.drizzle.db.insert(errorLogs).values({
        source: dto.source,
        message: dto.message.slice(0, 4000),
        stack: dto.stack?.slice(0, 8000),
        path: dto.path,
        context: dto.context,
      });
    } catch (err) {
      this.logger.warn(`Failed to persist error log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async listAll(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, [{ count }]] = await Promise.all([
      this.drizzle.db.query.errorLogs.findMany({ orderBy: desc(errorLogs.createdAt), limit, offset }),
      this.drizzle.db.select({ count: sql<number>`count(*)::int` }).from(errorLogs),
    ]);
    return { data, total: count, page, limit };
  }
}
