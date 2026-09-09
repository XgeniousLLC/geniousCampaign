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

// Lightweight auto-register: returns the existing def for this key, or
// creates a new text-type one if the key isn't defined yet. Used by the
// template editor's "insert token" custom-field picker so typing a brand
// new slug registers it, same as the webhook/public-API auto-create path.
export function ensureCustomFieldDef(key: string) {
  return apiPost<CustomFieldDef>('/custom-fields/ensure', { key });
}
