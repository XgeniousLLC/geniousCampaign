import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';

@Module({
  imports: [OutboundWebhooksModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
