import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Deliberately separate from AnalyticsController (which requires auth) —
 * the login screen needs a handful of real aggregate numbers before a JWT
 * exists. Only ever returns counts/rates, never per-contact or per-send
 * data, so it's safe to leave unauthenticated on an internal tool.
 */
@Controller('analytics/public')
export class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary() {
    return this.analytics.getPublicSummary();
  }
}
