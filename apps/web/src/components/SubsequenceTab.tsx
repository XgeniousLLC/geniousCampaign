import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listSubsequences,
  createSubsequence,
  updateSubsequence,
  removeSubsequence,
  listSchedules,
  scheduleLabel,
  type Subsequence,
  type SendingSchedule,
} from '../lib/sequencesApi';
import {
  CONDITION_FIELDS,
  OPERATOR_LABELS,
  OUTCOME_LABELS,
  THREAD_OUTCOMES,
  fieldMeta,
  describeConditionTree,
  isConditionGroup,
  type Condition,
  type ConditionField,
  type ConditionGroup,
  type ConditionOperator,
  type ConditionTree,
} from '@genius-campaign/shared';
import { useAuthStore } from '../stores/useAuthStore';

const fieldCls =
  'h-8 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-primary placeholder:text-text-quaternary focus:border-accent focus:outline-none disabled:opacity-60';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-text-label">{children}</div>
  );
}

function newCondition(field: ConditionField): Condition {
  const meta = fieldMeta(field)!;
  const operator = meta.operators[0];
  let value: Condition['value'] = '';
  if (meta.valueKind === 'boolean') value = true;
  else if (meta.valueKind === 'number' || meta.valueKind === 'step') value = 1;
  else if (meta.valueKind === 'outcome') value = ['interested'];
  return { kind: 'condition', field, operator, value };
}

function ConditionValue({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
}) {
  const meta = fieldMeta(condition.field);
  if (!meta) return null;

  if (meta.valueKind === 'boolean') {
    const on = condition.value === true || condition.value === 'true';
    return (
      <select
        value={on ? 'yes' : 'no'}
        onChange={(e) => onChange({ ...condition, value: e.target.value === 'yes' })}
        className={fieldCls}
      >
        <option value="yes">yes</option>
        <option value="no">no</option>
      </select>
    );
  }

  if (meta.valueKind === 'number' || meta.valueKind === 'step') {
    return (
      <input
        type="number"
        min={0}
        value={Number(condition.value) || 0}
        onChange={(e) => onChange({ ...condition, value: Number(e.target.value) })}
        className={`${fieldCls} w-20 font-mono`}
      />
    );
  }

  if (meta.valueKind === 'outcome') {
    const list = Array.isArray(condition.value) ? condition.value : [];
    return (
      <div className="flex flex-wrap gap-1">
        {THREAD_OUTCOMES.map((o) => {
          const on = list.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() =>
                onChange({
                  ...condition,
                  value: on ? list.filter((x) => x !== o) : [...list, o],
                })
              }
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                on
                  ? 'border-accent bg-accent/10 text-accent-light'
                  : 'border-border-strong text-text-muted hover:bg-raised'
              }`}
            >
              {OUTCOME_LABELS[o]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <input
      value={String(condition.value ?? '')}
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
      placeholder="value"
      className={`${fieldCls} min-w-[180px]`}
    />
  );
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const meta = fieldMeta(condition.field);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-label">Where</span>
      <select
        value={condition.field}
        onChange={(e) => onChange(newCondition(e.target.value as ConditionField))}
        className={fieldCls}
      >
        {CONDITION_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
        className={fieldCls}
      >
        {(meta?.operators ?? []).map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>
      <ConditionValue condition={condition} onChange={onChange} />
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-text-faint hover:text-danger"
        title="Remove condition"
      >
        ✕
      </button>
    </div>
  );
}

function ConditionGroupEditor({
  group,
  depth,
  onChange,
  onRemove,
}: {
  group: ConditionGroup;
  depth: number;
  onChange: (g: ConditionGroup) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={
        depth > 0
          ? 'rounded-md border border-border-subtle bg-surface p-2.5'
          : undefined
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-border-strong">
          {(['and', 'or'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...group, combinator: c })}
              className={`px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${
                group.combinator === c
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:bg-raised'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-text-faint">
          {depth === 0 ? 'All conditions must match' : 'of these'}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto text-[11px] text-text-muted hover:text-danger"
          >
            Remove group
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {group.children.map((child, i) =>
          isConditionGroup(child) ? (
            <ConditionGroupEditor
              key={i}
              group={child}
              depth={depth + 1}
              onChange={(g) =>
                onChange({ ...group, children: group.children.map((c, j) => (j === i ? g : c)) })
              }
              onRemove={() =>
                onChange({ ...group, children: group.children.filter((_, j) => j !== i) })
              }
            />
          ) : (
            <ConditionRow
              key={i}
              condition={child}
              onChange={(c) =>
                onChange({ ...group, children: group.children.map((x, j) => (j === i ? c : x)) })
              }
              onRemove={() =>
                onChange({ ...group, children: group.children.filter((_, j) => j !== i) })
              }
            />
          ),
        )}
        {group.children.length === 0 && (
          <p className="text-[11px] text-text-faint">No conditions yet — add one below.</p>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({ ...group, children: [...group.children, newCondition('replied')] })
          }
          className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-raised"
        >
          + Add condition
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...group,
              children: [
                ...group.children,
                {
                  kind: 'group',
                  combinator: depth === 0 ? 'or' : 'and',
                  children: [newCondition('replied')],
                },
              ],
            })
          }
          className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-raised"
        >
          + Add group
        </button>
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  tree: ConditionTree;
  startDay: number;
  scheduleId: string;
  stopParent: boolean;
}

function blankForm(): FormState {
  return {
    name: '',
    tree: { kind: 'group', combinator: 'and', children: [newCondition('replied')] },
    startDay: 0,
    scheduleId: '',
    stopParent: true,
  };
}

export function SubsequenceTab({
  sequenceId,
  onViewSettings,
}: {
  sequenceId: string;
  onViewSettings?: () => void;
}) {
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');
  const [subs, setSubs] = useState<Subsequence[]>([]);
  const [schedules, setSchedules] = useState<SendingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  function reload() {
    setLoading(true);
    listSubsequences(sequenceId)
      .then(setSubs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    listSchedules()
      .then(setSchedules)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId]);

  function startCreate() {
    setCreating(true);
    setEditingId('new');
    setForm(blankForm());
  }

  function startEdit(sub: Subsequence) {
    setCreating(false);
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      tree: sub.conditions?.children?.length
        ? sub.conditions
        : { kind: 'group', combinator: 'and', children: [newCondition('replied')] },
      startDay: Math.max(0, Math.round(Number(sub.delayMs) / 86_400_000)),
      scheduleId: sub.scheduleId ?? '',
      stopParent: sub.stopParent,
    });
  }

  function closeEditor() {
    setEditingId(null);
    setCreating(false);
  }

  async function save() {
    if (!form.name.trim() || form.tree.children.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        conditions: form.tree,
        delayMs: String(Math.max(0, Math.round(form.startDay)) * 86_400_000),
        stopParent: form.stopParent,
        scheduleId: form.scheduleId || null,
      };
      if (creating || !editingId || editingId === 'new') {
        await createSubsequence(sequenceId, payload);
      } else {
        await updateSubsequence(sequenceId, editingId, payload);
      }
      closeEditor();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeSub(id: string) {
    if (!window.confirm('Remove this subsequence and its steps?')) return;
    setBusy(true);
    setError(null);
    try {
      await removeSubsequence(sequenceId, id);
      setSubs((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const scheduleName = (id?: string | null) => {
    const s = id ? schedules.find((x) => x.id === id) : undefined;
    return s ? scheduleLabel(s) : 'Send anytime';
  };
  const canSave = canWrite && !!form.name.trim() && form.tree.children.length > 0 && !busy;

  return (
    <div className="max-w-[820px] space-y-4 pb-6">
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>
      )}

      <div className="flex items-start gap-2.5 rounded-md border border-info/25 bg-info/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-text-tertiary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0 text-info">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>
          All settings are inherited from the main sequence, and emails are sent from the Email
          Accounts linked to the parent sequence.{' '}
          <button onClick={onViewSettings} className="font-medium text-accent-light hover:underline">
            View Settings
          </button>
        </span>
      </div>

      <section className="rounded-md border border-border-default bg-panel p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-label">Subsequences</div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border-subtle bg-surface px-2 py-0.5 font-mono text-[10.5px] text-text-muted">
              {subs.length}
            </span>
            {canWrite && (
              <button
                onClick={startCreate}
                className="h-7 rounded-md bg-accent px-2.5 text-[11px] font-semibold text-white hover:bg-accent-hover"
              >
                + New subsequence
              </button>
            )}
          </div>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-text-faint">
          Route a prospect into its own multi-step branch when they meet the conditions below. Each
          subsequence owns a sequence with the same step editor as the main sequence.
        </p>

        {loading ? (
          <div className="animate-pulse py-4 text-xs text-text-muted">Loading subsequences…</div>
        ) : subs.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-emphasis bg-surface px-4 py-6 text-center">
            <div className="text-[13px] font-medium text-text-secondary">No subsequences yet</div>
            <div className="mt-0.5 text-xs text-text-faint">Add one to branch prospects into their own sequence.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {subs.map((s) => (
              <div key={s.id} className="rounded-md border border-border-subtle bg-surface px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-text-secondary">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-text-faint">
                      {describeConditionTree(s.conditions) || 'No conditions'}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-faint">
                      <span>→ {s.childName ?? 'Untitled sequence'}</span>
                      {Number(s.delayMs) > 0 && (
                        <span>· day {Math.round(Number(s.delayMs) / 86_400_000)}</span>
                      )}
                      <span>· {scheduleName(s.scheduleId)}</span>
                      <span>· {s.stopParent ? 'stops parent' : 'parent keeps running'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      to={`/sequences/${s.childSequenceId}`}
                      className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-raised"
                    >
                      Build steps
                    </Link>
                    {canWrite && (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-text-muted hover:bg-raised"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeSub(s.id)}
                          disabled={busy}
                          className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-medium text-text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingId !== null && canWrite && (
        <section className="rounded-md border border-border-default bg-panel p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-label">
            {creating ? 'New subsequence' : 'Edit subsequence'}
          </div>

          <div className="mb-4">
            <FieldLabel>Name</FieldLabel>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Interested — send the deck"
              className={`${fieldCls} w-full`}
            />
          </div>

          <div className="mb-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-label">Set condition</div>
            <p className="mb-2 text-[11px] text-text-faint">
              Select the trigger(s) for when the prospect is added to the subsequence.
            </p>
            <ConditionGroupEditor
              group={form.tree}
              depth={0}
              onChange={(g) => setForm((f) => ({ ...f, tree: g }))}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-label">Delay</div>
              <p className="mb-2 text-[11px] text-text-faint">
                After meeting the condition, when should the first step run?
              </p>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span>Start first step on day</span>
                <input
                  type="number"
                  min={0}
                  value={form.startDay}
                  onChange={(e) => setForm({ ...form, startDay: Number(e.target.value) })}
                  className={`${fieldCls} w-16 font-mono`}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-label">Schedule settings</div>
              <p className="mb-2 text-[11px] text-text-faint">Choose the send schedule for this branch.</p>
              <select
                value={form.scheduleId}
                onChange={(e) => setForm({ ...form, scheduleId: e.target.value })}
                className={`${fieldCls} w-full`}
              >
                <option value="">Send anytime</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>{scheduleLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="mb-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.stopParent}
              onChange={(e) => setForm({ ...form, stopParent: e.target.checked })}
              className="mt-0.5 accent-accent"
            />
            <span>
              <span className="block text-xs font-medium text-text-secondary">Stop the parent sequence when this fires</span>
              <span className="block text-[11px] text-text-faint">The prospect leaves the current sequence and only runs the subsequence.</span>
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              onClick={closeEditor}
              className="h-8 rounded-md border border-border-strong px-3.5 text-xs font-medium text-text-secondary hover:bg-raised"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="h-8 rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
