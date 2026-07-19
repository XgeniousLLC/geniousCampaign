import { apiGet, apiPost, apiDelete } from './api';

export type CustomFieldInputType = 'text' | 'number' | 'date' | 'url' | 'boolean' | 'select';

export interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  inputType: CustomFieldInputType;
  options: string[] | null;
  createdAt: string;
}

export function listCustomFieldDefs() {
  return apiGet<CustomFieldDef[]>('/custom-fields');
}

export function createCustomFieldDef(input: { label: string; inputType: CustomFieldInputType; options?: string[]; key?: string }) {
  return apiPost<CustomFieldDef>('/custom-fields', input);
}

export function deleteCustomFieldDef(id: string) {
  return apiDelete<{ id: string }>(`/custom-fields/${id}`);
}
