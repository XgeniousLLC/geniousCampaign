import { apiDelete, apiGet, apiPatch, apiPost, API_BASE_URL, authHeadersForUpload, type Page } from './api';

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
  tags?: { id: string; name: string; color: string }[];
  lists?: { id: string; name: string }[];
  verificationStatus?: 'valid' | 'invalid' | 'risky' | 'unknown' | null;
  lastActivityAt?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
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

export type ColumnTarget = 'email' | 'firstName' | 'lastName' | 'fullName' | 'custom' | 'ignore';

export interface ImportProgress {
  percent: number;
  processed: number;
  total: number;
  created: number;
  duplicates: number;
  invalid: number;
}

export interface ImportStatus {
  jobId: string;
  state: string;
  progress: ImportProgress | number;
  result?: {
    totalRows: number;
    created: number;
    duplicates: number;
    invalid: number;
    issues: { row: number; email?: string; reason: string; type: 'invalid' | 'error' }[];
  };
  failedReason?: string;
}

export function listContacts() {
  return apiGet<Contact[]>('/contacts');
}

export interface ContactsPage extends Page<Contact> {
  counts: Record<'all' | 'active' | 'unsubscribed' | 'bounced' | 'suppressed', number>;
  verifiedCount: number;
}

// GC-118: the paginated view the Contacts admin page uses — filtering,
// sorting, and paging all happen server-side so the page stays fast well
// past the 7k+ contacts where the old fetch-everything listContacts() call
// started taking 10s+. listContacts() above is untouched for the handful
// of callers that genuinely need the full array (pickers/lookups).
export function listContactsPaged(params: {
  page: number;
  limit: number;
  search?: string;
  status?: Contact['status'];
  listId?: string;
  sortKey?: 'name' | 'status' | 'lastActivityAt';
  sortDir?: 'asc' | 'desc';
}) {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.status) q.set('status', params.status);
  if (params.listId) q.set('listId', params.listId);
  if (params.sortKey) q.set('sortKey', params.sortKey);
  if (params.sortDir) q.set('sortDir', params.sortDir);
  return apiGet<ContactsPage>(`/contacts/paged?${q.toString()}`);
}

export function getContact(id: string) {
  return apiGet<Contact>(`/contacts/${id}`);
}

export function createContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, unknown>;
}) {
  return apiPost<Contact>('/contacts', input);
}

// Same deterministic hash + palette as the design's avatarColor() — every
// contact gets one stable color derived from its id, not a flat accent tint.
const AVATAR_PALETTE = ['#6366F1', '#3B82F6', '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899', '#10B981', '#EF4444', '#14B8A6', '#A855F7'];

export function avatarColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function updateContact(
  id: string,
  input: Partial<Pick<Contact, 'firstName' | 'lastName' | 'status'>> & { customFields?: Record<string, unknown> },
) {
  return apiPatch<Contact>(`/contacts/${id}`, input);
}

export function deleteContact(id: string) {
  return apiDelete(`/contacts/${id}`);
}

export function bulkDeleteContacts(ids: string[]) {
  return apiPost<{ deleted: number }>('/contacts/bulk-delete', { ids });
}

export function listTags() {
  return apiGet<Tag[]>('/tags');
}

export function createTag(input: { name: string; color?: string }) {
  return apiPost<Tag>('/tags', input);
}

export function listContactsForTag(tagId: string) {
  return apiGet<{ contact: Contact; addedAt: string }[]>(`/tags/${tagId}/contacts`);
}

export function listLists() {
  return apiGet<List[]>('/lists');
}

export function getList(id: string) {
  return apiGet<List>(`/lists/${id}`);
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

export async function uploadContactsCsv(
  file: File,
  opts: { columnMapping: Record<string, ColumnTarget>; listId?: string; tagIds?: string[]; status?: Contact['status'] },
): Promise<{ jobId: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('columnMapping', JSON.stringify(opts.columnMapping));
  if (opts.listId) form.append('listId', opts.listId);
  form.append('tagIds', JSON.stringify(opts.tagIds ?? []));
  if (opts.status) form.append('status', opts.status);
  const res = await fetch(`${API_BASE_URL}/contacts/import`, {
    method: 'POST',
    headers: { ...authHeadersForUpload() },
    body: form,
  });
  if (!res.ok) throw new Error(`Import upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export function getImportStatus(jobId: string) {
  return apiGet<ImportStatus>(`/contacts/import/${jobId}`);
}
