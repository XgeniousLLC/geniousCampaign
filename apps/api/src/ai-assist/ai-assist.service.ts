import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { AiUsageService } from './ai-usage.service';
import type { LlmProvider } from './llm-provider.interface';
import type { GenerateCopyDto } from './dto/generate-copy.dto';

const QUICK_ACTION_INSTRUCTIONS: Record<NonNullable<GenerateCopyDto['quickAction']>, string> = {
  shorter: 'Make the following copy noticeably shorter while keeping the core message.',
  casual: 'Rewrite the following copy in a more casual, conversational tone.',
  stat: 'Rewrite the following copy to include a plausible, relevant statistic that strengthens the pitch.',
};

// Tokens/buttons are rendered as literal text before reaching the model
// (renderBodyText turns a personalizationToken node into `{{contact.x}}`
// and a ctaButton node into `Label: url`) — the model must be told to keep
// those substrings intact so the frontend can parse them back into real
// nodes afterward, otherwise a "rewrite" silently drops every token/button.
const PRESERVE_STRUCTURE_INSTRUCTION =
  'Preserve every {{contact.x}} personalization token exactly as written, character for character. Preserve every "Label: url" line exactly as its own line (these are buttons) — do not merge them into surrounding prose or reword the label. Output only the rewritten email body text, with no preamble, explanation, or commentary.';

// This app's spintax feature (`{option A|option B}`) resolves one variant
// at random per actual send — asking the model to seed a few naturally
// helps avoid the identical-text-to-thousands-of-inboxes pattern spam
// filters key on, same reasoning as this app's own spintax feature.
const SPINTAX_INSTRUCTION =
  'Vary the wording in 2-4 natural spots (a greeting, a transition phrase, the sign-off) using spintax syntax: write alternatives directly in the text as {option A|option B|option C}. This is intentional — each real send resolves one variant at random, so the text isn\'t identical across every recipient, which helps engagement and avoids spam-filter pattern detection. Keep it natural: most of the copy should stay plain prose, spintax only where more than one phrasing genuinely reads fine.';

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
  constructor(
    private readonly settings: SettingsService,
    private readonly aiUsage: AiUsageService,
  ) {}

  private getProvider(): { provider: LlmProvider; providerName: string; model: string } {
    const providerName = (this.settings.get('LLM_PROVIDER') || 'openai').toLowerCase();

    if (providerName === 'deepseek') {
      const model = this.settings.get('LLM_MODEL') || DEFAULT_MODELS.deepseek;
      return {
        provider: new OpenAiCompatibleProvider('DeepSeek', 'https://api.deepseek.com', model, this.settings.get('DEEPSEEK_API_KEY')),
        providerName: 'deepseek',
        model,
      };
    }
    if (providerName === 'openai') {
      const model = this.settings.get('LLM_MODEL') || DEFAULT_MODELS.openai;
      return {
        provider: new OpenAiCompatibleProvider('OpenAI', 'https://api.openai.com/v1', model, this.settings.get('OPENAI_API_KEY')),
        providerName: 'openai',
        model,
      };
    }
    throw new InternalServerErrorException(`Unknown LLM_PROVIDER "${providerName}" — expected "openai" or "deepseek".`);
  }

  /** Sharifur's multi-provider decision: LLM_PROVIDER selects which real
   * provider is used, never hardcoded to one, never a stubbed response
   * when the selected provider's key is missing. */
  async generateCopy(dto: GenerateCopyDto): Promise<string> {
    const { provider, providerName, model } = this.getProvider();

    let prompt: string;
    if (dto.quickAction) {
      const subject = dto.previousResult ?? dto.context ?? dto.prompt;
      prompt = `${QUICK_ACTION_INSTRUCTIONS[dto.quickAction]} ${PRESERVE_STRUCTURE_INSTRUCTION} ${SPINTAX_INSTRUCTION}\n\n${subject}`;
    } else if (dto.context) {
      // A rewrite request ("make this more professional") — the user's
      // instruction alone has nothing to act on without the real current
      // content, so it's included explicitly rather than assumed.
      prompt = `${dto.prompt}\n\n${PRESERVE_STRUCTURE_INSTRUCTION} ${SPINTAX_INSTRUCTION}\n\nCurrent email content:\n${dto.context}`;
    } else {
      prompt = `${dto.prompt}\n\n${SPINTAX_INSTRUCTION}`;
    }

    const result = await provider.generate(prompt);
    if (result.usage) {
      // Fire-and-forget — a usage-tracking failure must never fail the
      // actual copy generation the user is waiting on.
      void this.aiUsage.record(providerName, model, result.usage.promptTokens, result.usage.completionTokens);
    }
    return result.text;
  }
}
