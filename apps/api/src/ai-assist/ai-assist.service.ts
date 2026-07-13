import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import type { LlmProvider } from './llm-provider.interface';
import type { GenerateCopyDto } from './dto/generate-copy.dto';

const QUICK_ACTION_INSTRUCTIONS: Record<NonNullable<GenerateCopyDto['quickAction']>, string> = {
  shorter: 'Make the following copy noticeably shorter while keeping the core message.',
  casual: 'Rewrite the following copy in a more casual, conversational tone.',
  stat: 'Rewrite the following copy to include a plausible, relevant statistic that strengthens the pitch.',
};

// Default model per provider when LLM_MODEL isn't set — kept in sync with
// the option lists Settings > Integrations offers for each provider
// (apps/web/src/routes/Settings.tsx's AI_MODEL_OPTIONS). Checked against
// each provider's live model list 2026-07-13 — deepseek-chat/deepseek-reasoner
// are deprecated 2026-07-24 in favor of deepseek-v4-flash/deepseek-v4-pro.
const DEFAULT_MODELS: Record<'openai' | 'deepseek', string> = {
  openai: 'gpt-5.4-mini',
  deepseek: 'deepseek-v4-flash',
};

@Injectable()
export class AiAssistService {
  constructor(private readonly settings: SettingsService) {}

  private getProvider(): LlmProvider {
    const providerName = (this.settings.get('LLM_PROVIDER') || 'openai').toLowerCase();

    if (providerName === 'deepseek') {
      return new OpenAiCompatibleProvider(
        'DeepSeek',
        'https://api.deepseek.com',
        this.settings.get('LLM_MODEL') || DEFAULT_MODELS.deepseek,
        this.settings.get('DEEPSEEK_API_KEY'),
      );
    }
    if (providerName === 'openai') {
      return new OpenAiCompatibleProvider(
        'OpenAI',
        'https://api.openai.com/v1',
        this.settings.get('LLM_MODEL') || DEFAULT_MODELS.openai,
        this.settings.get('OPENAI_API_KEY'),
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
