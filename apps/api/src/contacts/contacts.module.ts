import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactImportController } from './import/contact-import.controller';
import { ContactImportProcessor } from './import/contact-import.processor';
import { ListsModule } from '../lists/lists.module';
import { TagsModule } from '../tags/tags.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'contact-import' }), ListsModule, TagsModule, AuthModule],
  controllers: [ContactImportController, ContactsController],
  providers: [ContactsService, ContactImportProcessor],
  exports: [ContactsService],
})
export class ContactsModule {}
