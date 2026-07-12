import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { envValidationSchema } from './config/env.validation';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { ContactsModule } from './contacts/contacts.module';
import { ListsModule } from './lists/lists.module';
import { TagsModule } from './tags/tags.module';
import { TemplatesModule } from './templates/templates.module';
import { SequencesModule } from './sequences/sequences.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { VerificationModule } from './verification/verification.module';
import { AuthModule } from './auth/auth.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { SendingModule } from './sending/sending.module';
import { SuppressionModule } from './suppression/suppression.module';
import { TrackingModule } from './tracking/tracking.module';
import { SequenceRunnerModule } from './sequence-runner/sequence-runner.module';
import { OutboundWebhooksModule } from './outbound-webhooks/outbound-webhooks.module';
import { TriggersModule } from './triggers/triggers.module';
import { EventsModule } from './events/events.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    DbModule,
    HealthModule,
    ContactsModule,
    ListsModule,
    TagsModule,
    TemplatesModule,
    SequencesModule,
    WebhooksModule,
    VerificationModule,
    AuthModule,
    EnrollmentsModule,
    SendingModule,
    SuppressionModule,
    TrackingModule,
    SequenceRunnerModule,
    OutboundWebhooksModule,
    TriggersModule,
    EventsModule,
    CampaignsModule,
    UploadsModule,
  ],
})
export class AppModule {}
