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
import { manualUnsubscribe } from '../lib/suppressionApi';
import { useAuthStore } from '../stores/useAuthStore';
import { ContactEnrollments } from '../components/ContactEnrollments';
import { CustomFieldInput, FormField } from './ContactsList';
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
  const [editing, setEditing] = useState(false);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!contact) return <ContactDetailSkeleton />;

  const name = contact.firstName || contact.lastName ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : contact.email;
  const initials = ((contact.firstName?.[0] ?? contact.email[0]) + (contact.lastName?.[0] ?? '')).toUpperCase();
  const statusLabel = contact.status.charAt(0).toUpperCase() + contact.status.slice(1);
  const statusBlocked = contact.status === 'unsubscribed' || contact.status === 'suppressed' || contact.status === 'bounced';

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

  // Quick action: adds the contact to the real suppression list (so future
  // campaign/sequence sends actually skip them) and flips status to
  // 'unsubscribed' — same backend path as the contacts bulk action.
  async function runUnsubscribe() {
    if (!id || unsubscribing) return;
    setUnsubscribing(true);
    try {
      await manualUnsubscribe(id);
      setConfirmUnsubscribe(false);
      await reload();
      setNotice({ text: 'Contact unsubscribed — they will not receive future emails.', tone: 'success' });
    } catch (err) {
      setConfirmUnsubscribe(false);
      setNotice({ text: err instanceof Error ? err.message : 'Failed to unsubscribe contact.', tone: 'error' });
    } finally {
      setUnsubscribing(false);
    }
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

      <div className="mb-5 flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: avatarColor(contact.id) }}
          >
            {initials}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-text-heading">{name}</h1>
              {statusBlocked && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  {statusLabel}
                </span>
              )}
            </div>
            <div className="mt-0.5 font-mono text-xs text-text-muted">{contact.email}</div>
          </div>
        </div>
        {canWriteLists && (
          <div className="flex shrink-0 items-center gap-2">
            {contact.status !== 'unsubscribed' && (
              <button
                onClick={() => setConfirmUnsubscribe(true)}
                className="h-8 shrink-0 rounded-md border border-danger/30 bg-danger/10 px-3 text-xs font-medium text-danger hover:bg-danger/15"
              >
                Unsubscribe
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="h-8 shrink-0 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-4 rounded-md border px-3 py-2 text-xs ${
            notice.tone === 'success' ? 'border-success/25 bg-success/10 text-success' : 'border-danger/25 bg-danger/10 text-danger'
          }`}
        >
          {notice.text}
        </div>
      )}

      {editing ? (
        <EditContactForm
          contact={contact}
          defs={customFieldDefs}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      ) : (
        <div className="grid grid-cols-[280px_1fr] items-start gap-4">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-label">Fields</div>
            <div className="flex flex-col gap-2 text-xs">
              <Field label="Status" value={statusLabel} tone={statusBlocked ? 'danger' : 'default'} />
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
      )}

      {confirmUnsubscribe && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6" onClick={() => setConfirmUnsubscribe(false)}>
          <div
            className="w-[420px] max-w-full rounded-xl border border-border-modal bg-panel2 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-sm font-semibold text-text-heading">Unsubscribe this contact?</h3>
            <p className="mb-4 text-xs text-text-muted">
              <span className="font-mono text-text-secondary">{contact.email}</span> will be added to the suppression list and
              won&apos;t receive any future campaigns or sequences. The contact and their history are kept.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmUnsubscribe(false)}
                className="h-8 rounded-md border border-border-subtle px-3.5 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Cancel
              </button>
              <button
                onClick={runUnsubscribe}
                disabled={unsubscribing}
                className="h-8 rounded-md bg-danger px-3.5 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {unsubscribing ? 'Unsubscribing…' : 'Unsubscribe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One form for both updating an existing field and filling in one the contact
// doesn't have yet — allKeys starts with the contact's own customFields keys
// (so unknown/legacy keys like phone/website, or fields whose definition was
// later removed, are never hidden from editing) and appends every catalog
// definition not already present. Definitions are never created here (same
// GC-134 boundary: this page picks from the catalog, it doesn't invent keys).
function EditContactForm({
  contact,
  defs,
  onCancel,
  onSaved,
}: {
  contact: Contact;
  defs: CustomFieldDef[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(contact.firstName ?? '');
  const [lastName, setLastName] = useState(contact.lastName ?? '');
  const [email, setEmail] = useState(contact.email);
  const [status, setStatus] = useState<Contact['status']>(contact.status);
  const [definedKeys] = useState(() => Object.keys(contact.customFields));
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      Object.entries(contact.customFields).map(([k, v]) => [k, typeof v === 'boolean' ? v : v == null ? '' : String(v)]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function defFor(key: string): CustomFieldDef {
    return (
      defs.find((d) => d.key === key) ?? {
        id: key,
        key,
        label: key,
        inputType: typeof contact.customFields[key] === 'boolean' ? 'boolean' : 'text',
        options: null,
        createdAt: '',
      }
    );
  }

  const allKeys = [...definedKeys, ...defs.map((d) => d.key).filter((k) => !definedKeys.includes(k))];

  function valueForSave(key: string): string | boolean {
    const value = values[key];
    if (defFor(key).inputType === 'boolean') return value === true;
    return typeof value === 'string' ? value.trim() : '';
  }

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    try {
      // A key the contact already had is always written (so clearing a value
      // persists); a catalog key it didn't have is only written once filled
      // in, otherwise merely opening this form would litter customFields with
      // an empty entry for every unused definition.
      const customFields: Record<string, string | boolean> = {};
      for (const key of allKeys) {
        const value = valueForSave(key);
        if (definedKeys.includes(key) || (typeof value === 'boolean' ? value : value !== '')) customFields[key] = value;
      }

      await updateContact(contact.id, {
        email: email.trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        status,
        customFields,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-border-default bg-panel p-4">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Edit contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" value={firstName} onChange={setFirstName} placeholder="Amelia" />
          <FormField label="Last name" value={lastName} onChange={setLastName} placeholder="Chen" />
        </div>
        <div className="mt-3">
          <FormField label="Email" value={email} onChange={setEmail} placeholder="amelia.chen@example.com" type="email" />
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-medium text-text-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Contact['status'])}
            className="h-8 w-full rounded border border-border-default bg-field px-2 text-xs text-text-primary outline-none focus:border-border-emphasis"
          >
            {(['active', 'unsubscribed', 'bounced', 'suppressed'] as const).map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {allKeys.length > 0 && (
          <div className="mt-4 border-t border-border-default pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-label">Custom fields</div>
            <div className="grid grid-cols-2 gap-3">
              {allKeys.map((key) => (
                <CustomFieldInput
                  key={key}
                  def={defFor(key)}
                  value={values[key]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
                />
              ))}
            </div>
          </div>
        )}
        {error && <div className="mt-3 text-[11px] text-danger">{error}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-8 rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
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

function Field({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'danger' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className={`truncate font-medium ${tone === 'danger' ? 'text-danger' : 'text-text-secondary'}`}>{value}</span>
    </div>
  );
}
