import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addStep,
  getSequence,
  listSequences,
  listSteps,
  reorderSteps,
  removeStep,
  updateSequence,
  updateStep,
  type DelayUnit,
  type Sequence,
  type SequenceStep,
} from '../lib/sequencesApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { listContacts, avatarColor, type Contact } from '../lib/contactsApi';
import {
  enrollContact,
  listEnrollmentsForSequence,
  pauseEnrollment,
  resumeEnrollment,
  stopEnrollment,
  type Enrollment,
} from '../lib/enrollmentsApi';
import { useAuthStore } from '../stores/useAuthStore';
import { ChevronUpIcon, ChevronDownIcon, CloseIcon, ContactsEnterIcon, SpinnerIcon } from '../components/icons';

const TABS = ['Steps', 'Enrolled contacts'] as const;
type Tab = (typeof TABS)[number];

const ENROLLMENT_STATUS_STYLES: Record<Enrollment['status'], string> = {
  active: 'border-success/25 bg-success/10 text-success',
  paused: 'border-warning/25 bg-warning/10 text-warning',
  stopped: 'border-danger/25 bg-danger/10 text-danger',
  completed: 'border-text-muted/25 bg-text-muted/10 text-text-muted',
};

interface Block {
  key: string;
  delayStep: SequenceStep | null;
  sendStep: SequenceStep | null;
  otherStep: SequenceStep | null;
  index: number;
}

function buildBlocks(steps: SequenceStep[]): Block[] {
  const blocks: Block[] = [];
  let sendIndex = 0;
  let i = 0;
  while (i < steps.length) {
    const step = steps[i];
    const next = steps[i + 1];
    if (step.type === 'wait' && next?.type === 'send_email') {
      sendIndex++;
      blocks.push({ key: step.id, delayStep: step, sendStep: next, otherStep: null, index: sendIndex });
      i += 2;
    } else if (step.type === 'send_email') {
      sendIndex++;
      blocks.push({ key: step.id, delayStep: null, sendStep: step, otherStep: null, index: sendIndex });
      i += 1;
    } else {
      blocks.push({ key: step.id, delayStep: null, sendStep: null, otherStep: step, index: 0 });
      i += 1;
    }
  }
  return blocks;
}

function flattenBlockIds(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.otherStep ? [b.otherStep.id] : [...(b.delayStep ? [b.delayStep.id] : []), b.sendStep!.id]));
}

function initials(contact: Contact): string {
  const first = contact.firstName?.[0] ?? contact.email[0];
  const last = contact.lastName?.[0] ?? '';
  return (first + last).toUpperCase();
}

function displayName(contact: Contact): string {
  return contact.firstName || contact.lastName ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() : contact.email;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins && !days) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}

export function SequenceBuilder() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [tab, setTab] = useState<Tab>('Steps');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [enrollPickerOpen, setEnrollPickerOpen] = useState(false);
  const [enrollContactId, setEnrollContactId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [mutatingSteps, setMutatingSteps] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [savingBlockKey, setSavingBlockKey] = useState<string | null>(null);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function reload() {
    if (!id) return;
    const [seq, seqSteps, tpls, enr, allContacts, allSequences] = await Promise.all([
      getSequence(id),
      listSteps(id),
      listTemplates({ includeVariants: true }),
      listEnrollmentsForSequence(id),
      listContacts(),
      listSequences(),
    ]);
    setSequence(seq);
    setName(seq.name);
    setSteps(seqSteps);
    setTemplates(tpls);
    setEnrollments(enr);
    setContacts(allContacts);
    setOpenCount(allSequences.find((s) => s.id === id)?.openCount ?? 0);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const blocks = useMemo(() => buildBlocks(steps), [steps]);
  const sendBlocks = blocks.filter((b) => b.sendStep);

  const variantsByParent = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of templates) {
      if (!t.parentTemplateId) continue;
      const arr = map.get(t.parentTemplateId) ?? [];
      arr.push(t);
      map.set(t.parentTemplateId, arr);
    }
    return map;
  }, [templates]);

  const totalDurationMinutes = useMemo(() => {
    return blocks.reduce((sum, b) => {
      if (!b.delayStep) return sum;
      const mult = b.delayStep.delayUnit === 'days' ? 60 * 24 : b.delayStep.delayUnit === 'hours' ? 60 : 1;
      return sum + (b.delayStep.delayValue ?? 0) * mult;
    }, 0);
  }, [blocks]);

  const activeEnrolledCount = enrollments.filter((e) => e.status === 'active' || e.status === 'paused').length;

  async function saveName() {
    if (!id || !sequence || name === sequence.name) return;
    setSavingName(true);
    await updateSequence(id, { name });
    setSavingName(false);
    reload();
  }

  async function handleAddStep() {
    if (!id || mutatingSteps) return;
    setMutatingSteps(true);
    try {
      await addStep(id, { type: 'send_email' });
      await reload();
    } finally {
      setMutatingSteps(false);
    }
  }

  async function handleRemoveBlock(block: Block) {
    if (!id) return;
    const idsToRemove = new Set(
      [block.delayStep?.id, block.sendStep?.id, block.otherStep?.id].filter((v): v is string => !!v),
    );
    const previousSteps = steps;
    setSteps((prev) => prev.filter((s) => !idsToRemove.has(s.id)));
    setStepError(null);
    try {
      if (block.delayStep) await removeStep(id, block.delayStep.id);
      if (block.sendStep) await removeStep(id, block.sendStep.id);
      else if (block.otherStep) await removeStep(id, block.otherStep.id);
      reload();
    } catch {
      setSteps(previousSteps);
      setStepError('Failed to remove step — please try again.');
    }
  }

  async function moveBlock(index: number, direction: -1 | 1) {
    if (!id || mutatingSteps) return;
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setMutatingSteps(true);
    try {
      await reorderSteps(id, flattenBlockIds(next));
      await reload();
    } finally {
      setMutatingSteps(false);
    }
  }

  async function handleTemplateChange(block: Block, templateId: string) {
    if (!id || !block.sendStep) return;
    setSavingBlockKey(block.key);
    try {
      await updateStep(id, block.sendStep.id, { templateId });
      await reload();
    } finally {
      setSavingBlockKey(null);
    }
  }

  async function handleDelayChange(block: Block, delayValue: number, delayUnit: DelayUnit) {
    if (!id || !block.sendStep) return;
    setSavingBlockKey(block.key);
    try {
      if (block.delayStep) {
        await updateStep(id, block.delayStep.id, { delayValue, delayUnit });
      } else {
        const created = await addStep(id, { type: 'wait', delayValue, delayUnit });
        const ids = steps.map((s) => s.id);
        const sendIdx = ids.indexOf(block.sendStep.id);
        ids.splice(sendIdx, 0, created.id);
        await reorderSteps(id, ids);
      }
      await reload();
    } finally {
      setSavingBlockKey(null);
    }
  }

  async function handleEnroll() {
    if (!id || !enrollContactId) return;
    setBusy('enroll');
    try {
      await enrollContact(id, enrollContactId);
      setEnrollContactId('');
      setEnrollPickerOpen(false);
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function handlePauseSequence() {
    if (!id) return;
    setBusy('pause-all');
    try {
      const active = enrollments.filter((e) => e.status === 'active');
      for (const e of active) await pauseEnrollment(id, e.contactId);
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive() {
    if (!id || !sequence) return;
    setBusy('toggle-active');
    try {
      await updateSequence(id, { isActive: !sequence.isActive });
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function handleEnrollmentAction(action: 'pause' | 'resume' | 'stop', e: Enrollment) {
    if (!id) return;
    setBusy(e.id + action);
    try {
      const fn = action === 'pause' ? pauseEnrollment : action === 'resume' ? resumeEnrollment : stopEnrollment;
      await fn(id, e.contactId);
      reload();
    } finally {
      setBusy(null);
    }
  }

  function stepLabelFor(currentStepId: string | null): string {
    if (!currentStepId) return '—';
    const block = sendBlocks.find((b) => b.sendStep?.id === currentStepId);
    return block ? `Step ${block.index}` : '—';
  }

  const enrolledContacts = enrollments
    .filter((e) => e.status === 'active' || e.status === 'paused')
    .map((e) => e.contactId);
  const availableContacts = contacts.filter((c) => !enrolledContacts.includes(c.id));

  if (!sequence) {
    return (
      <div className="animate-pulse">
        <div className="mb-3 h-3 w-20 rounded bg-surface" />
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-40 rounded bg-surface" />
              <div className="h-5 w-14 rounded-full bg-surface" />
            </div>
            <div className="mt-2 h-3 w-28 rounded bg-surface" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-32 rounded-md bg-surface" />
            <div className="h-8 w-28 rounded-md bg-surface" />
          </div>
        </div>
        <div className="mb-5 flex gap-5 border-b border-border-default pb-2.5">
          <div className="h-4 w-12 rounded bg-surface" />
          <div className="h-4 w-28 rounded bg-surface" />
        </div>
        <div className="grid grid-cols-[1fr_280px] items-start gap-5">
          <div className="max-w-[620px]">
            <div className="mb-3.5 h-3 w-32 rounded bg-surface" />
            {[0, 1, 2].map((n) => (
              <div key={n}>
                <div className="ml-4 h-4 w-0.5 bg-border-strong" />
                <div className="h-[68px] rounded-md border border-border-default bg-panel" />
              </div>
            ))}
          </div>
          <div className="h-40 rounded-md border border-border-default bg-panel" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/sequences" className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
        ← Sequences
      </Link>

      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              disabled={!canWrite}
              className="min-w-0 bg-transparent text-base font-semibold text-text-heading outline-none disabled:opacity-70"
            />
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                activeEnrolledCount > 0 ? 'border-success/25 bg-success/10 text-success' : 'border-text-muted/25 bg-text-muted/10 text-text-muted'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {activeEnrolledCount > 0 ? 'Active' : 'Idle'}
            </span>
            {!sequence.isActive && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning"
                title="New enrollments (manual, public API, or trigger-driven) are blocked while disabled. Already-enrolled contacts keep running."
              >
                Disabled — not accepting new enrollments
              </span>
            )}
            {savingName && <span className="text-xs text-text-faint">Saving…</span>}
          </div>
          <p className="mt-1 text-xs text-text-muted">{enrollments.length} enrolled · {openCount} open</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setEnrollPickerOpen((v) => !v)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised"
              >
                Enroll contacts
              </button>
              {enrollPickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setEnrollPickerOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-border-modal bg-panel2 p-3 shadow-lg">
                    <select
                      value={enrollContactId}
                      onChange={(e) => setEnrollContactId(e.target.value)}
                      className="mb-2 h-8 w-full rounded-md border border-border-strong bg-field px-2 text-xs text-text-primary"
                    >
                      <option value="">Select a contact…</option>
                      {availableContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {displayName(c)} — {c.email}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleEnroll}
                      disabled={!enrollContactId || busy === 'enroll'}
                      className="h-8 w-full rounded-md bg-accent text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                      Enroll
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handlePauseSequence}
              disabled={busy === 'pause-all' || activeEnrolledCount === 0}
              className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pause sequence
            </button>
            <button
              onClick={handleToggleActive}
              disabled={busy === 'toggle-active'}
              title={sequence.isActive ? 'Stop accepting new enrollments (manual, public API, and trigger-driven)' : 'Resume accepting new enrollments'}
              className="h-8 rounded-md border border-border-strong bg-field px-3 text-xs font-medium text-text-secondary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sequence.isActive ? 'Disable sequence' : 'Enable sequence'}
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 flex gap-5 border-b border-border-default">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-medium ${
              tab === t ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Steps' && (
        <div className="grid grid-cols-[1fr_280px] items-start gap-5">
          <div className="max-w-[620px]">
            <div className="mb-3.5 flex items-center gap-2 text-[11.5px] font-medium text-text-meta">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
                <ContactsEnterIcon />
              </span>
              Contacts enter here
            </div>

            {blocks.map((block, i) => {
              const templateOptions = block.sendStep
                ? (() => {
                    const current = templates.find((t) => t.id === block.sendStep!.templateId);
                    const parentId = current?.parentTemplateId ?? current?.id;
                    const variants = parentId ? variantsByParent.get(parentId) ?? [] : [];
                    const parent = parentId ? templates.find((t) => t.id === parentId) : undefined;
                    return parent ? [parent, ...variants] : [];
                  })()
                : [];

              return (
                <div key={block.key}>
                  <div className="ml-4 h-4 w-0.5 bg-border-strong" />
                  {block.otherStep ? (
                    <div className="flex items-center justify-between rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted">
                      <span className="capitalize">{block.otherStep.type} step</span>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveBlock(i, -1)} disabled={i === 0 || mutatingSteps} className="text-text-faint hover:text-text-primary disabled:opacity-20"><ChevronUpIcon /></button>
                          <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1 || mutatingSteps} className="text-text-faint hover:text-text-primary disabled:opacity-20"><ChevronDownIcon /></button>
                          <button onClick={() => handleRemoveBlock(block)} className="ml-1 text-text-faint hover:text-danger"><CloseIcon /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`overflow-hidden rounded-md border border-border-default bg-panel transition-opacity ${savingBlockKey === block.key ? 'opacity-60' : ''}`}>
                      {block.index > 1 && (
                        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface px-3 py-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B8290" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          <span className="text-xs text-text-tertiary">Delay before this step</span>
                          <input
                            type="number"
                            min={0}
                            value={block.delayStep?.delayValue ?? 1}
                            disabled={!canWrite || savingBlockKey === block.key}
                            onChange={(e) => handleDelayChange(block, Number(e.target.value), block.delayStep?.delayUnit ?? 'days')}
                            className="h-7 w-14 rounded border border-border-default bg-field px-2 font-mono text-xs text-text-primary disabled:opacity-60"
                          />
                          <select
                            value={block.delayStep?.delayUnit ?? 'days'}
                            disabled={!canWrite || savingBlockKey === block.key}
                            onChange={(e) => handleDelayChange(block, block.delayStep?.delayValue ?? 1, e.target.value as DelayUnit)}
                            className="h-7 rounded border border-border-default bg-field px-2 text-xs text-text-primary disabled:opacity-60"
                          >
                            <option value="minutes">minutes</option>
                            <option value="hours">hours</option>
                            <option value="days">days</option>
                          </select>
                          {savingBlockKey === block.key && <SpinnerIcon className="text-text-faint" />}
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10 font-mono text-xs font-semibold text-accent-light">
                          {block.index}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-label">
                            Send email
                            {savingBlockKey === block.key && <SpinnerIcon className="text-accent-light" />}
                          </div>
                          <select
                            value={block.sendStep!.templateId ?? ''}
                            onChange={(e) => handleTemplateChange(block, e.target.value)}
                            disabled={!canWrite || savingBlockKey === block.key}
                            className="h-8 w-full rounded-md border border-border-strong bg-field px-2 text-xs text-text-primary disabled:opacity-60"
                          >
                            <option value="">Select a template…</option>
                            {templates
                              .filter((t) => !t.parentTemplateId)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        {canWrite && (
                          <>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveBlock(i, -1)} disabled={i === 0 || mutatingSteps} className="rounded px-1 text-text-faint hover:text-text-primary disabled:opacity-20"><ChevronUpIcon /></button>
                              <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1 || mutatingSteps} className="rounded px-1 text-text-faint hover:text-text-primary disabled:opacity-20"><ChevronDownIcon /></button>
                            </div>
                            <button onClick={() => handleRemoveBlock(block)} className="ml-1 text-text-faint hover:text-danger"><CloseIcon /></button>
                          </>
                        )}
                      </div>
                      {templateOptions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pl-[50px]">
                          {templateOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleTemplateChange(block, opt.id)}
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                opt.id === block.sendStep!.templateId
                                  ? 'border-accent/30 bg-accent/10 text-accent-tint'
                                  : 'border-border-strong bg-field text-text-quaternary hover:bg-raised'
                              }`}
                            >
                              {opt.parentTemplateId ? opt.name : 'Original'}
                            </button>
                          ))}
                          <Link
                            to={`/templates/${templateOptions[0]?.id}`}
                            target="_blank"
                            className="flex items-center gap-1 rounded-md border border-dashed border-border-emphasis px-2 py-0.5 text-[11px] font-medium text-text-quaternary hover:text-text-secondary"
                          >
                            + Manage variants
                          </Link>
                          <span className="text-[10.5px] text-text-meta">Variants can be A/B tested — configure in the template editor</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="ml-4 h-4 w-0.5 bg-border-strong" />
            {canWrite && (
              <button
                onClick={handleAddStep}
                disabled={mutatingSteps}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-emphasis bg-surface py-3 text-xs font-semibold text-accent-light hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingSteps ? (
                  <SpinnerIcon />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                )}
                {mutatingSteps ? 'Working…' : 'Add step'}
              </button>
            )}
            {stepError && <p className="mt-2 text-xs text-danger">{stepError}</p>}
          </div>

          <div className="rounded-md border border-border-default bg-panel p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-label">Summary</div>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Steps</span>
                <span className="font-mono font-semibold text-text-primary">{sendBlocks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total duration</span>
                <span className="font-mono font-semibold text-text-primary">{formatDuration(totalDurationMinutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Enrolled</span>
                <span className="font-mono font-semibold text-text-primary">{enrollments.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Enrolled contacts' && (
        <div className="overflow-hidden rounded-md border border-border-default bg-panel">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default bg-surface text-[11px] uppercase tracking-wide text-text-meta">
                <th className="px-3.5 py-2 text-left font-medium">Contact</th>
                <th className="px-3 py-2 text-left font-medium">Current step</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                {canWrite && <th className="px-3.5 py-2 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => {
                const c = contacts.find((x) => x.id === e.contactId);
                return (
                  <tr key={e.id} className="border-t border-border-subtle hover:bg-raised">
                    <td className="px-3.5 py-2.5">
                      {c ? (
                        <Link to={`/contacts/${c.id}`} className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: avatarColor(c.id) }}>
                            {initials(c)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-text-secondary">{displayName(c)}</span>
                            <span className="block truncate font-mono text-[11px] text-text-faint">{c.email}</span>
                          </span>
                        </Link>
                      ) : (
                        <span className="font-mono text-text-faint">{e.contactId}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-tertiary">{stepLabelFor(e.currentStepId)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${ENROLLMENT_STATUS_STYLES[e.status]}`}>{e.status}</span>
                    </td>
                    {canWrite && (
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {(e.status === 'active' || e.status === 'paused') && (
                            <>
                              <button
                                onClick={() => handleEnrollmentAction(e.status === 'active' ? 'pause' : 'resume', e)}
                                disabled={busy === e.id + (e.status === 'active' ? 'pause' : 'resume')}
                                className="h-6 rounded border border-border-default px-2 text-[11px] text-text-muted hover:text-text-primary disabled:opacity-50"
                              >
                                {e.status === 'active' ? 'Pause' : 'Resume'}
                              </button>
                              <button
                                onClick={() => handleEnrollmentAction('stop', e)}
                                disabled={busy === e.id + 'stop'}
                                className="h-6 rounded border border-danger/30 px-2 text-[11px] text-danger hover:bg-danger/10 disabled:opacity-50"
                              >
                                Stop
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 4 : 3} className="px-3.5 py-8 text-center text-text-muted">
                    No contacts enrolled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
