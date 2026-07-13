import { apiPost } from './api';

export type QuickAction = 'shorter' | 'casual' | 'stat';

export function generateAiCopy(input: { prompt: string; quickAction?: QuickAction; previousResult?: string; context?: string }) {
  return apiPost<{ text: string }>('/ai-assist/generate', input);
}
