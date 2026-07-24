import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addContactList,
  addContactTag,
  avatarColor,
  contactLists,
  contactTags,
  getContact,
  listLists,
  listTags,
  removeContactList,
  removeContactTag,
  updateContact,
  type Contact,
  type List,
  type Tag,
} from '../lib/contactsApi';
import { listCustomFieldDefs, type CustomFieldDef } from '../lib/customFieldsApi';
import { useAuthStore } from '../stores/useAuthStore';
import { ContactEnrollments } from '../components/ContactEnrollments';
import { CustomFieldInput } from './ContactsList';
import { PanelListSkeleton } from '../components/skeletons';

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<{ tag: Tag; has: boolean }[]>([]);
  const [lists, setLists] = useState<{ list: List; has: boolean }[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [addingField, setAddingField] = useState(false);
  const [newFieldDefId, setNewFieldDefId] = useState('');
  const [newFieldValue, setNewFieldValue] = useState<string | boolean>('');
  const [savingField, setSavingField] = useState(false);
  const canWriteLists = useAuthStore((s) => s.user?.role !== 'viewer');

  async function reload() {
    if (!id) return;
    const [c, allTags, allLists, allDefs] = await Promise.all([getContact(id), listTags(), listLists(), listCustomFieldDefs()]);
    setContact(c);
    setTags(await contactTags(id, allTags));
    setLists(await contactLists(id, allLists));
    setCustomFieldDefs(allDefs);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!contact) return <ContactDetailSkeleton />;

  const name = contact.firstName || contact.lastName ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : contact.email;
  const initials = ((contact.firstName?.[0] ?? contact.email[0]) + (contact.lastName?.[0] ?? '')).toUpperCase();

  async function toggleTag(tagId: string, has: boolean) {
    if (!id) return;
    if (has) await removeContactTag(tagId, id);
    else await addContactTag(tagId, id);
    reload();
  }

  async function toggleList(listId: string, has: boolean) {
    if (!id) return;
    if (has) await removeContactList(listId, id);
    else await addContactList(listId, id);
    reload();
  }

  const availableFieldDefs = customFieldDefs.filter((def) => !(def.key in contact.customFields));
  const selectedFieldDef = customFieldDefs.find((def) => def.id === newFieldDefId);

  async function submitNewField() {
    if (!id || !selectedFieldDef) return;
    setSavingField(true);
    try {
      await updateContact(id, { customFields: { [selectedFieldDef.key]: newFieldValue } });
      setAddingField(false);
      setNewFieldDefId('');
      setNewFieldValue('');
      reload();
    } finally {
      setSavingField(false);
    }
  }

  return (
    <div>
      <Link to="/contacts" className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
        ← Contacts
      </Link>

      <div className="mb-5 flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: avatarColor(contact.id) }}
        >
          {initials}
        </span>
        <div>
          <h1 className="text-base font-semibold text-text-heading">{name}</h1>
          <div className="mt-0.5 font-mono text-xs text-text-muted">{contact.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] items-start gap-4">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-label">Fields</div>
            <div className="flex flex-col gap-2 text-xs">
              <Field label="Status" value={contact.status.charAt(0).toUpperCase() + contact.status.slice(1)} />
              <Field label="Created" value={new Date(contact.createdAt).toLocaleDateString()} />
              {Object.entries(contact.customFields).map(([k, v]) => (
                <Field key={k} label={k} value={String(v)} />
              ))}
            </div>

            {canWriteLists &&
              (addingField ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-border-default pt-3">
                  <select
                    value={newFieldDefId}
                    onChange={(e) => {
                      setNewFieldDefId(e.target.value);
                      setNewFieldValue('');
                    }}
                    className="h-7 rounded border border-border-default bg-field px-1.5 text-[11px] text-text-primary outline-none focus:border-border-emphasis"
                  >
                    <option value="">Select field…</option>
                    {availableFieldDefs.map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                  {selectedFieldDef && (
                    <CustomFieldInput def={selectedFieldDef} value={newFieldValue} onChange={setNewFieldValue} />
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={submitNewField}
                      disabled={!selectedFieldDef || savingField}
                      className="h-7 rounded-md bg-accent px-2.5 text-[11px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                      {savingField ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setAddingField(false);
                        setNewFieldDefId('');
                        setNewFieldValue('');
                      }}
                      className="h-7 rounded-md border border-border-strong bg-field px-2.5 text-[11px] font-medium text-text-secondary hover:bg-raised"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                availableFieldDefs.length > 0 && (
                  <button
                    onClick={() => setAddingField(true)}
                    className="mt-3 self-start text-[11px] font-medium text-accent hover:text-accent-hover"
                  >
                    + Add field
                  </button>
                )
              ))}
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-label">Tags</div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {tags.map(({ tag, has }) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id, has)}
                  className={`rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                    has ? '' : 'border-dashed border-border-emphasis text-text-faint hover:text-text-muted'
                  }`}
                  style={has ? { backgroundColor: `${tag.color}1F`, borderColor: `${tag.color}4D`, color: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && <span className="text-[11px] text-text-faint">No tags yet.</span>}
            </div>

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-label">Lists</div>
            <div className="flex flex-col gap-1.5">
              {lists.map(({ list, has }) => (
                <button
                  key={list.id}
                  onClick={() => canWriteLists && toggleList(list.id, has)}
                  disabled={!canWriteLists}
                  className={`flex items-center gap-2 text-left text-xs disabled:cursor-default ${has ? 'text-text-tertiary' : 'text-text-faint hover:text-text-muted'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${has ? 'bg-accent-light' : 'bg-border-emphasis'}`} />
                  {list.name}
                </button>
              ))}
              {lists.length === 0 && <span className="text-[11px] text-text-faint">No lists yet.</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ContactEnrollments contactId={contact.id} />
          <div className="rounded-md border border-border-default bg-panel p-4 text-xs text-text-muted">
            Activity feed and send history land with later Sprint 1/4 tickets.
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactDetailSkeleton() {
  return (
    <div>
      <div className="mb-4 h-3.5 w-20 animate-pulse rounded bg-raised2" />

      <div className="mb-5 flex items-center gap-3.5">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-raised2" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 animate-pulse rounded bg-raised2" />
          <div className="h-3 w-52 animate-pulse rounded bg-raised2" />
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] items-start gap-4">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3 h-2.5 w-14 animate-pulse rounded bg-raised2" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-raised2" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-raised2" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-2.5 h-2.5 w-10 animate-pulse rounded bg-raised2" />
            <div className="mb-4 flex flex-wrap gap-1.5">
              <div className="h-5 w-16 animate-pulse rounded-sm bg-raised2" />
              <div className="h-5 w-12 animate-pulse rounded-sm bg-raised2" />
            </div>
            <div className="mb-2.5 h-2.5 w-10 animate-pulse rounded bg-raised2" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-raised2" />
                  <div className="h-2.5 w-24 animate-pulse rounded bg-raised2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border-default bg-panel">
            <div className="border-b border-border-default p-4">
              <div className="h-2.5 w-24 animate-pulse rounded bg-raised2" />
            </div>
            <PanelListSkeleton rows={3} />
          </div>
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="h-2.5 w-56 animate-pulse rounded bg-raised2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="truncate font-medium text-text-secondary">{value}</span>
    </div>
  );
}
