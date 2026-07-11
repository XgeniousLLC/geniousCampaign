import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    DbModule,
    HealthModule,
    ContactsModule,
  ],
})
export class AppModule {}
