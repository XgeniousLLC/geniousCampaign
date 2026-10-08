import { Logger, Module, OnModuleInit } from '@nestjs/common';
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
export class CampaignsModule implements OnModuleInit {
  private readonly logger = new Logger(CampaignsModule.name);

  constructor(private readonly campaigns: CampaignsService) {}

  /** Self-healing boot: re-enqueue whatever a crash/restart left behind
   * (campaigns wedged in 'sending', scheduled drafts whose delayed job is
   * gone). Everything re-enqueued is idempotent, so this is safe on every
   * boot — and it is what makes scheduled/automatic sends survive a
   * deploy without anyone having the panel open. */
  async onModuleInit() {
    try {
      const result = await this.campaigns.resumeStuckCampaigns();
      if (result.resumed > 0) {
        this.logger.log(`Resumed ${result.resumed} stuck campaign(s) on boot`);
      }
    } catch (err) {
      this.logger.error(
        `Campaign resume sweep failed on boot: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
