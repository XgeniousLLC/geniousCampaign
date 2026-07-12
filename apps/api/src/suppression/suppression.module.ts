import { Module } from '@nestjs/common';
import { SuppressionService } from './suppression.service';
import { SuppressionController } from './suppression.controller';
import { UnsubscribeController } from './unsubscribe.controller';
import { SesSnsController } from './ses-sns.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SuppressionController, UnsubscribeController, SesSnsController],
  providers: [SuppressionService],
  exports: [SuppressionService],
})
export class SuppressionModule {}
