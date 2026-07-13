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
  type Contact,
  type List,
  type Tag,
} from '../lib/contactsApi';
import { useAuthStore } from '../stores/useAuthStore';
import { ContactEnrollments } from '../components/ContactEnrollments';

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<{ tag: Tag; has: boolean }[]>([]);
  const [lists, setLists] = useState<{ list: List; has: boolean }[]>([]);
  const canWriteLists = useAuthStore((s) => s.user?.role !== 'viewer');

  async function reload() {
    if (!id) return;
    const [c, allTags, allLists] = await Promise.all([getContact(id), listTags(), listLists()]);
    setContact(c);
    setTags(await contactTags(id, allTags));
    setLists(await contactLists(id, allLists));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!contact) return <div className="text-sm text-text-muted">Loading…</div>;

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{label}</span>
      <span className="truncate font-medium text-text-secondary">{value}</span>
    </div>
  );
}
