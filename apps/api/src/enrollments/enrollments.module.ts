import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { SequenceWebhookController } from './sequence-webhook.controller';
import { AdminEnrollmentController } from './admin-enrollment.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ListsModule } from '../lists/lists.module';
import { TagsModule } from '../tags/tags.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WebhooksModule, ListsModule, TagsModule, AuthModule],
  controllers: [SequenceWebhookController, AdminEnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentsModule {}
