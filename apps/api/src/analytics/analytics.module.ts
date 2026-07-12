import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { PublicAnalyticsController } from './public-analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController, PublicAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
