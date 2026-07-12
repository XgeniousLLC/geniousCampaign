import { useEffect, useState } from 'react';
import {
  listLists,
  createList,
  listContactsForList,
  listTags,
  createTag,
  listContactsForTag,
  type List,
  type Tag,
} from '../lib/contactsApi';
import { useAuthStore } from '../stores/useAuthStore';

export function ListsAndTags() {
  const [lists, setLists] = useState<(List & { memberCount: number })[]>([]);
  const [tags, setTags] = useState<(Tag & { memberCount: number })[]>([]);
  const [newListName, setNewListName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function loadLists() {
    const all = await listLists();
    const withCounts = await Promise.all(all.map(async (l) => ({ ...l, memberCount: (await listContactsForList(l.id)).length })));
    setLists(withCounts);
  }

  async function loadTags() {
    const all = await listTags();
    const withCounts = await Promise.all(all.map(async (t) => ({ ...t, memberCount: (await listContactsForTag(t.id)).length })));
    setTags(withCounts);
  }

  useEffect(() => {
    loadLists();
    loadTags();
  }, []);

  async function handleCreateList() {
    if (!newListName.trim()) return;
    await createList({ name: newListName.trim() });
    setNewListName('');
    loadLists();
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    await createTag({ name: newTagName.trim() });
    setNewTagName('');
    loadTags();
  }

  return (
    <div>
      <div className="mb-[18px]">
        <h1 className="text-lg font-semibold text-text-heading">Lists &amp; Tags</h1>
        <p className="mt-1 text-xs text-text-muted">Static lists are fixed sets; dynamic lists update automatically from rules.</p>
      </div>

      <div className="grid grid-cols-[1fr_320px] items-start gap-[18px]">
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="flex items-center justify-between border-b border-border-default px-3.5 py-3">
            <span className="text-sm font-semibold text-text-primary">Lists</span>
            {canWrite && (
              <div className="flex gap-1.5">
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="New list name…"
                  className="h-7 w-40 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
                />
                <button onClick={handleCreateList} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
                  Add
                </button>
              </div>
            )}
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-text-meta">
                <th className="px-3.5 py-2 font-medium">Name</th>
                <th className="px-2.5 py-2 font-medium">Type</th>
                <th className="px-2.5 py-2 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((l) => (
                <tr key={l.id} className="border-t border-border-subtle hover:bg-raised">
                  <td className="px-3.5 py-2.5 font-medium text-text-secondary">{l.name}</td>
                  <td className="px-2.5 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        l.type === 'dynamic' ? 'border-info/25 bg-info/10 text-info' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
                      }`}
                    >
                      {l.type}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-text-tertiary">{l.memberCount}</td>
                </tr>
              ))}
              {lists.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3.5 py-6 text-center text-text-muted">
                    No lists yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <div className="flex items-center justify-between border-b border-border-default px-3.5 py-3">
            <span className="text-sm font-semibold text-text-primary">Tags</span>
          </div>
          {canWrite && (
            <div className="flex gap-1.5 p-2 pb-0">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag…"
                className="h-7 flex-1 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary placeholder:text-text-faint"
              />
              <button onClick={handleCreateTag} className="h-7 rounded-md border border-border-subtle bg-surface px-2.5 text-xs font-medium text-text-secondary hover:bg-raised">
                Add
              </button>
            </div>
          )}
          <div className="p-1.5">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-raised">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
                <span className="flex-1 text-xs text-text-secondary">{t.name}</span>
                <span className="font-mono text-[11px] text-text-faint">{t.memberCount}</span>
              </div>
            ))}
            {tags.length === 0 && <div className="px-2 py-4 text-center text-xs text-text-faint">No tags yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
