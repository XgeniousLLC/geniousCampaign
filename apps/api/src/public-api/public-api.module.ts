import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { ListsModule } from '../lists/lists.module';
import { TagsModule } from '../tags/tags.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ContactsModule, ListsModule, TagsModule, ApiKeysModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
