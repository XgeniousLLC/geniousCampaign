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
