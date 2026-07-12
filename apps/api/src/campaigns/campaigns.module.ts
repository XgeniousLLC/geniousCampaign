import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignSendProcessor } from './campaign-send.processor';
import { AuthModule } from '../auth/auth.module';
import { ListsModule } from '../lists/lists.module';
import { SuppressionModule } from '../suppression/suppression.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SendingModule } from '../sending/sending.module';

@Module({
  imports: [
    AuthModule,
    ListsModule,
    SuppressionModule,
    TrackingModule,
    SendingModule,
    BullModule.registerQueue({ name: 'campaign-send' }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignSendProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule {}
