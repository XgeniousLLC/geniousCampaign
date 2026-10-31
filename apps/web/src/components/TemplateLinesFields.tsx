import type { Dispatch, SetStateAction } from 'react';
import { TemplateLineField } from './TemplateLineField';

/** Subject-line and preview-text lists shared by the plain and designed template editors. */
export function TemplateLinesFields({
  subjectLines,
  setSubjectLines,
  previewTextLines,
  setPreviewTextLines,
  canWrite,
}: {
  subjectLines: string[];
  setSubjectLines: Dispatch<SetStateAction<string[]>>;
  previewTextLines: string[];
  setPreviewTextLines: Dispatch<SetStateAction<string[]>>;
  canWrite: boolean;
}) {
  const update = (set: Dispatch<SetStateAction<string[]>>, index: number, value: string) =>
    set((prev) => prev.map((s, i) => (i === index ? value : s)));
  const remove = (set: Dispatch<SetStateAction<string[]>>, index: number) =>
    set((prev) => prev.filter((_, i) => i !== index));

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border-subtle px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-meta">Subject lines — one is picked at random per send</span>
          {canWrite && (
            <button
              type="button"
              onClick={() => setSubjectLines((prev) => [...prev, ''])}
              className="text-[11px] font-medium text-accent-light hover:text-accent-lighter"
            >
              + Add subject line
            </button>
          )}
        </div>
        {subjectLines.map((line, i) => (
          <TemplateLineField
            key={i}
            value={line}
            onChange={(v) => update(setSubjectLines, i, v)}
            onRemove={canWrite ? () => remove(setSubjectLines, i) : undefined}
            removeDisabled={subjectLines.length <= 1}
            placeholder="Subject line, e.g. Hi {{contact.firstName}}"
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-b border-border-subtle px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-meta">Preview text — inbox preheader, also shuffled per send</span>
          {canWrite && (
            <button
              type="button"
              onClick={() => setPreviewTextLines((prev) => [...prev, ''])}
              className="text-[11px] font-medium text-accent-light hover:text-accent-lighter"
            >
              + Add preview text
            </button>
          )}
        </div>
        {previewTextLines.length === 0 && <div className="text-xs text-text-faint">No preview text set.</div>}
        {previewTextLines.map((line, i) => (
          <TemplateLineField
            key={i}
            value={line}
            onChange={(v) => update(setPreviewTextLines, i, v)}
            onRemove={canWrite ? () => remove(setPreviewTextLines, i) : undefined}
            placeholder="Preview text shown next to the subject in the inbox"
          />
        ))}
      </div>
    </>
  );
}
