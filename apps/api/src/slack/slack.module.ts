import { Module } from '@nestjs/common';
import { SlackNotificationService } from './slack-notification.service';
import { SlackEventListenerService } from './slack-event-listener.service';

@Module({
  providers: [SlackNotificationService, SlackEventListenerService],
  exports: [SlackNotificationService],
})
export class SlackModule {}
