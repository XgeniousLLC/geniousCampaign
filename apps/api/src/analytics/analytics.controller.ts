import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Query('days') days?: string) {
    return this.analytics.getOverview(days ? Number(days) : undefined);
  }

  @Get('trend')
  trend(@Query('days') days?: string) {
    return this.analytics.getEngagementTrend(days ? Number(days) : undefined);
  }

  @Get('recent-campaigns')
  recentCampaigns(@Query('limit') limit?: string) {
    return this.analytics.getRecentCampaigns(limit ? Number(limit) : undefined);
  }

  @Get('recent-activity')
  recentActivity(@Query('limit') limit?: string) {
    return this.analytics.getRecentActivity(limit ? Number(limit) : undefined);
  }
}
