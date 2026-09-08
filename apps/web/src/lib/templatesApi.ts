import { apiDelete, apiGet, apiPatch, apiPost } from './api';

export interface Template {
  id: string;
  name: string;
  // Multiple subject lines — one is picked at random per send (true A/B).
  subjectLines: string[];
  // Preheader/preview-text lines — same shuffle pattern; empty = none set.
  previewTextLines: string[];
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  folder: string | null;
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
  subjectLines: string[];
  previewTextLines: string[];
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  createdAt: string;
}

export interface SaveTemplateInput {
  name: string;
  subjectLines: string[];
  previewTextLines: string[];
  bodyJson: Record<string, unknown>;
}

export function listTemplates() {
  return apiGet<Template[]>('/templates');
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

export function sendTestEmail(input: { to: string; subject: string; bodyHtml: string; bodyText: string }) {
  return apiPost<{ sent: boolean; provider: 'ses' | 'gmail' }>('/templates/send-test', input);
}

export function deleteTemplate(id: string) {
  return apiDelete<{ id: string }>(`/templates/${id}`);
}

export function deleteTemplates(ids: string[]) {
  return apiPost<{ deletedCount: number }>('/templates/bulk-delete', { ids });
}
