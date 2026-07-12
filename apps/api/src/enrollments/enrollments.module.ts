import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { SequenceWebhookController } from './sequence-webhook.controller';
import { AdminEnrollmentController } from './admin-enrollment.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WebhooksModule, AuthModule],
  controllers: [SequenceWebhookController, AdminEnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentsModule {}
