import { Module } from '@nestjs/common';
import { AiAssistController } from './ai-assist.controller';
import { AiAssistService } from './ai-assist.service';
import { AiUsageService } from './ai-usage.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiAssistController],
  providers: [AiAssistService, AiUsageService],
})
export class AiAssistModule {}
