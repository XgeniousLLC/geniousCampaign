import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { LlmProvider, LlmGenerateResult } from './llm-provider.interface';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Both OpenAI and DeepSeek expose an OpenAI-compatible chat completions
 * endpoint (DeepSeek's API is a drop-in-compatible superset) — one shared
 * implementation parameterized by base URL / model / API key, rather than
 * duplicating near-identical request/response handling twice.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  private readonly logger: Logger;

  constructor(
    private readonly providerName: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey: string | undefined,
  ) {
    this.logger = new Logger(`${providerName}Provider`);
  }

  async generate(prompt: string): Promise<LlmGenerateResult> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(`${this.providerName} is not configured — no API key set.`);
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You write concise, high-converting cold outreach email copy. Output only the requested copy, no preamble, no markdown formatting, no quotation marks around the result.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`${this.providerName} API returned ${res.status}: ${body}`);
      throw new Error(`${this.providerName} API returned ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error(`${this.providerName} returned no content`);
    }
    const usage =
      data.usage?.prompt_tokens !== undefined && data.usage?.completion_tokens !== undefined
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined;
    return { text, usage };
  }
}
