import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiAssistService } from './ai-assist.service';
import { AiUsageService } from './ai-usage.service';
import { GenerateCopyDto } from './dto/generate-copy.dto';

@Controller('ai-assist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssistController {
  constructor(
    private readonly aiAssist: AiAssistService,
    private readonly aiUsage: AiUsageService,
  ) {}

  @Post('generate')
  @Roles('owner', 'editor')
  async generate(@Body() dto: GenerateCopyDto) {
    const text = await this.aiAssist.generateCopy(dto);
    return { text };
  }

  @Get('usage-summary')
  @Roles('owner')
  getUsageSummary() {
    return this.aiUsage.getSummary();
  }
}
