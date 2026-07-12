import { apiDelete, apiGet, apiPatch, apiPost, API_BASE_URL, authHeadersForUpload } from './api';

export interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  customFields: Record<string, unknown>;
  status: 'active' | 'unsubscribed' | 'bounced' | 'suppressed';
  createdAt: string;
  updatedAt: string;
  // Present on list responses only (GET /contacts) — joined in server-side.
  tags?: { id: string; name: string }[];
  lists?: { id: string; name: string }[];
  verificationStatus?: 'valid' | 'invalid' | 'risky' | 'unknown' | null;
  lastActivityAt?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface List {
  id: string;
  name: string;
  type: 'static' | 'dynamic';
  filterDefinition: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportStatus {
  jobId: string;
  state: string;
  progress: number;
  result?: {
    totalRows: number;
    created: number;
    updated: number;
    errors: { row: number; email?: string; error: string }[];
  };
  failedReason?: string;
}

export function listContacts() {
  return apiGet<Contact[]>('/contacts');
}

export function getContact(id: string) {
  return apiGet<Contact>(`/contacts/${id}`);
}

export function createContact(input: { email: string; firstName?: string; lastName?: string }) {
  return apiPost<Contact>('/contacts', input);
}

export function updateContact(id: string, input: Partial<Pick<Contact, 'firstName' | 'lastName' | 'status'>>) {
  return apiPatch<Contact>(`/contacts/${id}`, input);
}

export function deleteContact(id: string) {
  return apiDelete(`/contacts/${id}`);
}

export function listTags() {
  return apiGet<Tag[]>('/tags');
}

export function createTag(input: { name: string }) {
  return apiPost<Tag>('/tags', input);
}

export function listContactsForTag(tagId: string) {
  return apiGet<{ contact: Contact; addedAt: string }[]>(`/tags/${tagId}/contacts`);
}

export function listLists() {
  return apiGet<List[]>('/lists');
}

export function createList(input: { name: string }) {
  return apiPost<List>('/lists', input);
}

export function listContactsForList(listId: string) {
  return apiGet<{ contact: Contact; addedAt: string }[]>(`/lists/${listId}/contacts`);
}

export function addContactTag(tagId: string, contactId: string) {
  return apiPost(`/tags/${tagId}/contacts/${contactId}`, {});
}

export function removeContactTag(tagId: string, contactId: string) {
  return apiDelete(`/tags/${tagId}/contacts/${contactId}`);
}

export function contactTags(contactId: string, allTags: Tag[]) {
  return Promise.all(
    allTags.map((tag) =>
      apiGet<{ contact: Contact }[]>(`/tags/${tag.id}/contacts`).then((rows) => ({
        tag,
        has: rows.some((r) => r.contact.id === contactId),
      })),
    ),
  );
}

export function contactLists(contactId: string, allLists: List[]) {
  return Promise.all(
    allLists.map((list) =>
      apiGet<{ contact: Contact }[]>(`/lists/${list.id}/contacts`).then((rows) => ({
        list,
        has: rows.some((r) => r.contact.id === contactId),
      })),
    ),
  );
}

export function addContactList(listId: string, contactId: string) {
  return apiPost(`/lists/${listId}/contacts/${contactId}`, {});
}

export function removeContactList(listId: string, contactId: string) {
  return apiDelete(`/lists/${listId}/contacts/${contactId}`);
}

export async function uploadContactsCsv(file: File): Promise<{ jobId: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/contacts/import`, {
    method: 'POST',
    headers: { ...authHeadersForUpload() },
    body: form,
  });
  if (!res.ok) throw new Error(`Import upload failed: ${res.status}`);
  return res.json();
}

export function getImportStatus(jobId: string) {
  return apiGet<ImportStatus>(`/contacts/import/${jobId}`);
}
