import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiAssistService } from './ai-assist.service';
import { GenerateCopyDto } from './dto/generate-copy.dto';

@Controller('ai-assist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssistController {
  constructor(private readonly aiAssist: AiAssistService) {}

  @Post('generate')
  @Roles('owner', 'editor')
  async generate(@Body() dto: GenerateCopyDto) {
    const text = await this.aiAssist.generateCopy(dto);
    return { text };
  }
}
