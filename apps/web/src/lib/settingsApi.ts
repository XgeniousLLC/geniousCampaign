import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export interface SettingField {
  key: string;
  label: string;
  secret: boolean;
  configured: boolean;
  source: 'db' | 'env' | 'unset';
  value: string | null;
  options?: string[];
  verifyOnly?: boolean;
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

export interface TrackingDomainVerifyResult {
  verified: boolean;
  domain?: string;
  devSkip?: boolean;
  record?: { type: string; host: string; value: string };
}

export function verifyTrackingDomain(domain: string) {
  return apiPost<TrackingDomainVerifyResult>('/settings/tracking-domain/verify', { domain });
}
