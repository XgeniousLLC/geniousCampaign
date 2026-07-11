import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addStep,
  getSequence,
  listSteps,
  reorderSteps,
  removeStep,
  updateSequence,
  updateStep,
  type DelayUnit,
  type Sequence,
  type SequenceStep,
  type StepType,
} from '../lib/sequencesApi';
import { listTemplates, type Template } from '../lib/templatesApi';
import { useAuthStore } from '../stores/useAuthStore';

const STEP_LABELS: Record<StepType, string> = {
  send_email: 'Send email',
  wait: 'Wait',
  condition: 'Condition',
  exit: 'Exit',
};

export function SequenceBuilder() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const canWrite = useAuthStore((s) => s.user?.role !== 'viewer');

  async function reload() {
    if (!id) return;
    const [seq, seqSteps, tpls] = await Promise.all([getSequence(id), listSteps(id), listTemplates()]);
    setSequence(seq);
    setName(seq.name);
    setSteps(seqSteps);
    setTemplates(tpls);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveName() {
    if (!id || !sequence || name === sequence.name) return;
    setSavingName(true);
    await updateSequence(id, { name });
    setSavingName(false);
    reload();
  }

  async function handleAddStep() {
    if (!id) return;
    await addStep(id, { type: 'send_email' });
    reload();
  }

  async function handleRemoveStep(stepId: string) {
    if (!id) return;
    await removeStep(id, stepId);
    reload();
  }

  async function handleStepTypeChange(stepId: string, type: StepType) {
    if (!id) return;
    await updateStep(id, stepId, { type });
    reload();
  }

  async function handleTemplateChange(stepId: string, templateId: string) {
    if (!id) return;
    await updateStep(id, stepId, { templateId });
    reload();
  }

  async function handleDelayChange(stepId: string, delayValue: number, delayUnit: DelayUnit) {
    if (!id) return;
    await updateStep(id, stepId, { delayValue, delayUnit });
    reload();
  }

  async function move(index: number, direction: -1 | 1) {
    if (!id) return;
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const ids = steps.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderSteps(id, ids);
    reload();
  }

  if (!sequence) return <div className="text-sm text-text-muted">Loading…</div>;

  return (
    <div>
      <Link to="/sequences" className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
        ← Sequences
      </Link>

      <div className="mb-5 flex items-center justify-between gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          disabled={!canWrite}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-text-heading outline-none disabled:opacity-70"
        />
        {savingName && <span className="text-xs text-text-faint">Saving…</span>}
      </div>

      <div className="grid grid-cols-[1fr_260px] items-start gap-5">
        <div className="max-w-2xl">
          <div className="mb-3.5 flex items-center gap-2 text-[11.5px] font-medium text-text-meta">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">●</span>
            Contacts enter here
          </div>

          {steps.map((step, i) => (
            <div key={step.id}>
              <div className="ml-4 h-4 w-0.5 bg-border-strong" />
              <div className="overflow-hidden rounded-md border border-border-default bg-panel">
                {step.type === 'wait' && (
                  <div className="flex items-center gap-2 border-b border-border-subtle bg-surface px-3 py-2 text-xs text-text-muted">
                    ⏱ Wait {step.delayValue ?? 0} {step.delayUnit ?? 'days'}
                  </div>
                )}
                <div className="flex items-center gap-2.5 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10 font-mono text-xs font-semibold text-accent-light">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <select
                      value={step.type}
                      onChange={(e) => handleStepTypeChange(step.id, e.target.value as StepType)}
                      disabled={!canWrite}
                      className="mb-1.5 h-6 rounded border border-border-default bg-field px-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-label disabled:opacity-60"
                    >
                      {(Object.keys(STEP_LABELS) as StepType[]).map((t) => (
                        <option key={t} value={t}>
                          {STEP_LABELS[t]}
                        </option>
                      ))}
                    </select>

                    {step.type === 'send_email' && (
                      <select
                        value={step.templateId ?? ''}
                        onChange={(e) => handleTemplateChange(step.id, e.target.value)}
                        disabled={!canWrite}
                        className="h-8 w-full rounded-md border border-border-strong bg-field px-2 text-xs text-text-primary disabled:opacity-60"
                      >
                        <option value="">Select a template…</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {step.type === 'wait' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={step.delayValue ?? 1}
                          onChange={(e) => handleDelayChange(step.id, Number(e.target.value), step.delayUnit ?? 'days')}
                          className="h-7 w-16 rounded border border-border-default bg-field px-2 font-mono text-xs text-text-primary"
                        />
                        <select
                          value={step.delayUnit ?? 'days'}
                          onChange={(e) => handleDelayChange(step.id, step.delayValue ?? 1, e.target.value as DelayUnit)}
                          className="h-7 rounded border border-border-default bg-field px-2 text-xs text-text-primary"
                        >
                          <option value="minutes">minutes</option>
                          <option value="hours">hours</option>
                          <option value="days">days</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {canWrite && (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="rounded px-1 text-text-faint hover:text-text-primary disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === steps.length - 1}
                          className="rounded px-1 text-text-faint hover:text-text-primary disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>
                      <button onClick={() => handleRemoveStep(step.id)} className="ml-1 text-text-faint hover:text-danger">
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="ml-4 h-4 w-0.5 bg-border-strong" />
          {canWrite && (
            <button
              onClick={handleAddStep}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-emphasis bg-surface py-3 text-xs font-semibold text-accent-light hover:bg-raised"
            >
              + Add step
            </button>
          )}
        </div>

        <div className="rounded-md border border-border-default bg-panel p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-label">Summary</div>
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Steps</span>
              <span className="font-mono font-semibold text-text-primary">{steps.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
