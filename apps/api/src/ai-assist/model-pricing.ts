// USD per 1M tokens, checked against each provider's official pricing page
// 2026-07-16. DeepSeek's input price is its (higher) cache-miss rate — this
// app doesn't distinguish cache hit/miss per call, so cost is a worst-case
// estimate for DeepSeek calls, not exact. Re-check both providers' pricing
// pages periodically; a wrong number here silently misreports real spend.
const MODEL_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  // OpenAI — current GPT-5.x family
  'gpt-5.6-sol': { input: 5.0, output: 30.0 },
  'gpt-5.6-terra': { input: 2.5, output: 15.0 },
  'gpt-5.6-luna': { input: 1.0, output: 6.0 },
  'gpt-5.5': { input: 5.0, output: 30.0 },
  'gpt-5.5-pro': { input: 30.0, output: 180.0 },
  'gpt-5.4': { input: 2.5, output: 15.0 },
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  'gpt-5.4-pro': { input: 30.0, output: 180.0 },
  'gpt-5.3-codex': { input: 1.75, output: 14.0 },

  // DeepSeek — current V4 names, plus the legacy aliases this app's
  // Settings > Integrations model dropdown still offers until they're
  // retired 2026-07-24
  'deepseek-v4-flash': { input: 0.14, output: 0.28 },
  'deepseek-v4-pro': { input: 0.435, output: 0.87 },
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.435, output: 0.87 },
};

export interface UsageCost {
  costUsd: number | null;
}

/** Null when the model isn't in the table above — the caller should show
 * "cost unknown" rather than fabricate a number for an unpriced/unlisted
 * model (e.g. a legacy gpt-4o-mini/gpt-4.1-mini call, superseded on
 * OpenAI's current pricing page but still selectable in this app's UI). */
export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number | null {
  const pricing = MODEL_PRICING_PER_1M[model];
  if (!pricing) return null;
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}
