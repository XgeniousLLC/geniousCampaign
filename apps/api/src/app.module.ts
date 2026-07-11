import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './config/env.validation';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { ContactsModule } from './contacts/contacts.module';
import { ListsModule } from './lists/lists.module';
import { TagsModule } from './tags/tags.module';
import { TemplatesModule } from './templates/templates.module';
import { SequencesModule } from './sequences/sequences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
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
  ],
})
export class AppModule {}
