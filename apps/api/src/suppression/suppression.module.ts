import { Module } from '@nestjs/common';
import { SuppressionService } from './suppression.service';
import { SuppressionController } from './suppression.controller';
import { UnsubscribeController } from './unsubscribe.controller';
import { SesSnsController } from './ses-sns.controller';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [AuthModule, ContactsModule],
  controllers: [SuppressionController, UnsubscribeController, SesSnsController],
  providers: [SuppressionService],
  exports: [SuppressionService],
})
export class SuppressionModule {}
