import { apiGet, apiPost } from './api';

export type QuickAction = 'shorter' | 'casual' | 'stat';

export function generateAiCopy(input: { prompt: string; quickAction?: QuickAction; previousResult?: string; context?: string }) {
  return apiPost<{ text: string }>('/ai-assist/generate', input);
}

export interface AiUsageByModel {
  provider: string;
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number | null;
}

export interface AiUsageSummary {
  totals: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
    hasUnknownCost: boolean;
  };
  byModel: AiUsageByModel[];
}

export function getAiUsageSummary() {
  return apiGet<AiUsageSummary>('/ai-assist/usage-summary');
}
