import { apiDelete, apiGet, apiPatch } from './api';

export interface SettingField {
  key: string;
  label: string;
  secret: boolean;
  configured: boolean;
  source: 'db' | 'env' | 'unset';
  value: string | null;
  options?: string[];
}

export interface SettingCategory {
  key: string;
  label: string;
  description: string;
  fields: SettingField[];
  instructions?: string[];
}

export function getIntegrationSettings() {
  return apiGet<SettingCategory[]>('/settings/integrations');
}

export function updateIntegrationSettings(values: Record<string, string>) {
  return apiPatch<SettingCategory[]>('/settings/integrations', { values });
}

export function clearIntegrationSetting(key: string) {
  return apiDelete<SettingCategory[]>(`/settings/integrations/${key}`);
}

export function clearVerificationCache() {
  return apiDelete<{ cleared: number }>('/verification/cache');
}

// Applies the R2 bucket CORS rule for direct browser uploads, using the
// already-saved R2 credentials — the API authorizes this app's own Origin
// automatically, so there is nothing to type or mismatch.
export function applyR2Cors() {
  return apiPost<{ origins: string[] }>('/uploads/cors', {});
}

export function getSesSnsWebhookUrl() {
  return apiGet<{ url: string }>('/webhooks/ses/sns/webhook-url');
}
