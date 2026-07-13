import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import { renderBodyText, resolveSpintax, type ProseMirrorNode } from '@genius-campaign/shared';
import { createTemplate, listTemplateVariants, type Template } from '../lib/templatesApi';
import { generateAiCopy } from '../lib/aiAssistApi';
import { aiTextToDoc } from '../lib/aiTextToDoc';

const VARIANT_COUNT = 3;

interface Variant {
  subject: string;
  body: string;
}

// The AI endpoint returns free text — ask it for a fixed SUBJECT:/BODY:
// format so it can be split back into the two fields a template needs.
function parseAiVariant(text: string): Variant {
  const subjectMatch = text.match(/SUBJECT:\s*(.*)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]*)/i);
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : '',
    body: bodyMatch ? bodyMatch[1].trim() : text.trim(),
  };
}

function VariantCard({
  label,
  variant,
  saveKey,
  templateId,
  savingKey,
  savedKeys,
  onSave,
}: {
  label: string;
  variant: Variant;
  saveKey: string;
  templateId?: string;
  savingKey: string | null;
  savedKeys: Set<string>;
  onSave: (saveKey: string, label: string, variant: Variant) => void;
}) {
  const isSaving = savingKey === saveKey;
  const isSaved = savedKeys.has(saveKey);

  return (
    <div className="overflow-hidden rounded-md border border-border-subtle bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle bg-panel2 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-light" />
          <span className="text-[11px] font-semibold text-text-muted">{label}</span>
        </div>
        <button
          onClick={() => onSave(saveKey, label, variant)}
          disabled={!templateId || isSaving || isSaved}
          title={!templateId ? 'Save the template first' : undefined}
          className="rounded border border-border-subtle bg-surface px-2 py-0.5 text-[10.5px] font-medium text-text-tertiary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaved ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save as variant'}
        </button>
      </div>
      <div className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
        {variant.subject || <span className="text-text-faint">(no subject)</span>}
      </div>
      <div className="whitespace-pre-wrap px-3 py-2.5 text-xs leading-relaxed text-text-tertiary">{variant.body}</div>
    </div>
  );
}

export function SpintaxShufflePreview({
  editor,
  subject,
  templateId,
  templateName,
}: {
  editor: Editor | null;
  subject: string;
  templateId?: string;
  templateName: string;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [aiVariant, setAiVariant] = useState<Variant | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savedVariants, setSavedVariants] = useState<Template[]>([]);

  // Variants saved earlier (this session or a prior one) are real template
  // rows — without this fetch, reloading the page loses them from view
  // entirely, since `variants`/`aiVariant` above are ephemeral, in-memory
  // shuffle/AI results only. Refetched after a new save too.
  function loadSavedVariants() {
    if (!templateId) return;
    listTemplateVariants(templateId).then(setSavedVariants);
  }

  useEffect(() => {
    loadSavedVariants();
  }, [templateId]);

  function currentBodyText() {
    if (!editor) return '';
    return renderBodyText(editor.getJSON() as ProseMirrorNode);
  }

  function shuffle() {
    if (!editor) return;
    const rawText = currentBodyText();
    setVariants(
      Array.from({ length: VARIANT_COUNT }, () => ({
        subject: resolveSpintax(subject),
        body: resolveSpintax(rawText),
      })),
    );
  }

  async function generateWithAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const rawText = currentBodyText();
      const prompt = `Write one alternate variant of this email that keeps the same intent, tone, and call to action, but different wording. Reply in exactly this format with no extra commentary:\nSUBJECT: <subject line>\nBODY:\n<body text>\n\nOriginal subject: ${subject}\nOriginal body:\n${rawText}`;
      const { text } = await generateAiCopy({ prompt });
      setAiVariant(parseAiVariant(text));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed.');
    } finally {
      setAiLoading(false);
    }
  }

  async function saveVariant(saveKey: string, label: string, variant: Variant) {
    if (!templateId) return;
    setSavingKey(saveKey);
    try {
      await createTemplate({
        name: `${templateName} — ${label}`,
        subject: variant.subject,
        bodyJson: aiTextToDoc(variant.body),
        parentTemplateId: templateId,
      });
      setSavedKeys((s) => new Set(s).add(saveKey));
      loadSavedVariants();
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="rounded-md border border-border-default bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">Shuffle preview</div>
          <div className="text-[11px] text-text-faint">Randomly resolved variants — save any as its own template</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={generateWithAi}
            disabled={aiLoading}
            title="Generate a variant with AI, following this template's content"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-field text-sm text-accent-light hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiLoading ? '…' : '✦'}
          </button>
          <button
            onClick={shuffle}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-field px-2.5 text-xs font-medium text-text-secondary hover:bg-raised"
          >
            Shuffle
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {variants.length === 0 && !aiVariant && (
          <div className="px-1 py-2 text-xs text-text-faint">Click Shuffle to see resolved variants, or ✦ to generate one with AI.</div>
        )}
        {aiError && <div className="px-1 text-xs text-danger">{aiError}</div>}
        {aiVariant && (
          <VariantCard
            label="AI variant"
            variant={aiVariant}
            saveKey="ai"
            templateId={templateId}
            savingKey={savingKey}
            savedKeys={savedKeys}
            onSave={saveVariant}
          />
        )}
        {variants.map((v, i) => (
          <VariantCard
            key={i}
            label={`Variant ${i + 1}`}
            variant={v}
            saveKey={`shuffle-${i}`}
            templateId={templateId}
            savingKey={savingKey}
            savedKeys={savedKeys}
            onSave={saveVariant}
          />
        ))}
      </div>

      {savedVariants.length > 0 && (
        <div className="border-t border-border-default p-3">
          <div className="mb-2 px-1 text-[11px] uppercase tracking-wide text-text-meta">Saved variants</div>
          <div className="flex flex-col gap-1.5">
            {savedVariants.map((v) => (
              <Link
                key={v.id}
                to={`/templates/${v.id}`}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-panel px-3 py-2 hover:bg-raised"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-text-secondary">{v.name}</div>
                  <div className="truncate text-[11px] text-text-faint">{v.subject || '(no subject)'}</div>
                </div>
                <span className="shrink-0 text-[10.5px] text-text-faint">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
