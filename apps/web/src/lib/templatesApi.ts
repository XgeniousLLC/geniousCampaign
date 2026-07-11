import { apiGet, apiPatch, apiPost } from './api';

export interface Template {
  id: string;
  name: string;
  subject: string;
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  bodyText: string;
  folder: string | null;
  createdAt: string;
  updatedAt: string;
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
