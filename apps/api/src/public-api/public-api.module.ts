import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PublicApiController } from './public-api.controller';
import { PublicApiThrottlerGuard } from './public-api-throttler.guard';
import { ContactsModule } from '../contacts/contacts.module';
import { ListsModule } from '../lists/lists.module';
import { TagsModule } from '../tags/tags.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';

@Module({
  imports: [
    // 60 req/min per API key (or per IP for unauthenticated/bad-key
    // requests) — a basic flood cap, not fine-grained per-endpoint tuning.
    // See docs/PUBLIC_API.md for the documented limit.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ContactsModule,
    ListsModule,
    TagsModule,
    ApiKeysModule,
    EnrollmentsModule,
    CustomFieldsModule,
  ],
  controllers: [PublicApiController],
  providers: [PublicApiThrottlerGuard],
})
export class PublicApiModule {}
