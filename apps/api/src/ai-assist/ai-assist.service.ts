import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import type { LlmProvider } from './llm-provider.interface';
import type { GenerateCopyDto } from './dto/generate-copy.dto';

const QUICK_ACTION_INSTRUCTIONS: Record<NonNullable<GenerateCopyDto['quickAction']>, string> = {
  shorter: 'Make the following copy noticeably shorter while keeping the core message.',
  casual: 'Rewrite the following copy in a more casual, conversational tone.',
  stat: 'Rewrite the following copy to include a plausible, relevant statistic that strengthens the pitch.',
};

@Injectable()
export class AiAssistService {
  constructor(private readonly config: ConfigService) {}

  private getProvider(): LlmProvider {
    const providerName = (this.config.get<string>('LLM_PROVIDER') || 'openai').toLowerCase();

    if (providerName === 'deepseek') {
      return new OpenAiCompatibleProvider(
        'DeepSeek',
        'https://api.deepseek.com',
        'deepseek-chat',
        this.config.get<string>('DEEPSEEK_API_KEY'),
      );
    }
    if (providerName === 'openai') {
      return new OpenAiCompatibleProvider(
        'OpenAI',
        'https://api.openai.com/v1',
        'gpt-4o-mini',
        this.config.get<string>('OPENAI_API_KEY'),
      );
    }
    throw new InternalServerErrorException(`Unknown LLM_PROVIDER "${providerName}" — expected "openai" or "deepseek".`);
  }

  /** Sharifur's multi-provider decision: LLM_PROVIDER selects which real
   * provider is used, never hardcoded to one, never a stubbed response
   * when the selected provider's key is missing. */
  async generateCopy(dto: GenerateCopyDto): Promise<string> {
    const provider = this.getProvider();

    const prompt = dto.quickAction
      ? `${QUICK_ACTION_INSTRUCTIONS[dto.quickAction]}\n\n${dto.previousResult ?? dto.prompt}`
      : dto.prompt;

    return provider.generate(prompt);
  }
}
