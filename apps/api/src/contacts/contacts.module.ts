import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactImportController } from './import/contact-import.controller';
import { ContactImportProcessor } from './import/contact-import.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'contact-import' })],
  controllers: [ContactImportController, ContactsController],
  providers: [ContactsService, ContactImportProcessor],
  exports: [ContactsService],
})
export class ContactsModule {}
