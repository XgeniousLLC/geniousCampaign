import { apiGet, apiPatch, apiPost } from './api';

export interface Template {
  id: string;
  name: string;
  subject: string;
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  folder: string | null;
  // Set when this template is a saved shuffle/AI variant of another template.
  parentTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /templates) — computed server-side.
  uses?: number;
  openRatePct?: number;
  // Distinct sequences that reference this template in a step.
  usedInCount?: number;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  name: string;
  subject: string;
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  createdAt: string;
}

export interface SaveTemplateInput {
  name: string;
  subject: string;
  bodyJson: Record<string, unknown>;
  parentTemplateId?: string;
}

export function listTemplates(opts?: { includeVariants?: boolean }) {
  return apiGet<Template[]>(`/templates${opts?.includeVariants ? '?includeVariants=true' : ''}`);
}

export function getTemplate(id: string) {
  return apiGet<Template>(`/templates/${id}`);
}

export function createTemplate(input: SaveTemplateInput) {
  return apiPost<Template>('/templates', input);
}

export function updateTemplate(id: string, input: SaveTemplateInput) {
  return apiPatch<Template>(`/templates/${id}`, input);
}

export function listTemplateVersions(id: string) {
  return apiGet<TemplateVersion[]>(`/templates/${id}/versions`);
}

export function listTemplateVariants(id: string) {
  return apiGet<Template[]>(`/templates/${id}/variants`);
}

export function sendTestEmail(input: { to: string; subject: string; bodyHtml: string; bodyText: string }) {
  return apiPost<{ sent: boolean; provider: 'ses' | 'gmail' }>('/templates/send-test', input);
}
