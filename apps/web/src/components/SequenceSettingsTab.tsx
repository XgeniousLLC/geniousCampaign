import { useEffect, useMemo, useState } from 'react';
import {
  getSequenceSettings,
  updateSequenceSettings,
  listSchedules,
  createSchedule,
  updateSchedule,
  type SequenceSettings,
  type SendingSchedule,
} from '../lib/sequencesApi';

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-default bg-panel p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-label">{title}</div>
      {hint && <p className="mb-3 text-xs text-text-faint">{hint}</p>}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-raised2'
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white transition-all ${
          checked ? 'left-[18px]' : 'left-[2px]'
        }`}
      />
    </button>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-text-secondary">{title}</div>
        {desc && <div className="mt-0.5 text-xs leading-relaxed text-text-faint">{desc}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

const inputCls =
  'h-8 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-primary placeholder:text-text-quaternary focus:border-accent focus:outline-none disabled:opacity-60';

/** Text input with local draft state — commits on blur or Enter. */
function TextField({
  value,
  onCommit,
  placeholder,
  type,
  className,
}: {
  value: string | number | null;
  onCommit: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value));
  useEffect(() => {
    setDraft(value === null || value === undefined ? '' : String(value));
  }, [value]);
  return (
    <input
      type={type ?? 'text'}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={`${inputCls} ${className ?? ''}`}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-text-label">{children}</div>
  );
}

/** Inline radio card used for grouped choices. */
function RadioCard({
  selected,
  onSelect,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 ${
        selected ? 'border-accent bg-accent/10' : 'border-border-strong hover:bg-raised'
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 accent-accent"
      />
      <span>
        <span className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
          {title}
          {badge && (
            <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-text-faint">{desc}</span>
      </span>
    </label>
  );
}

const PRIORITIES = [
  { value: 'followups', title: 'Prioritise Follow-Ups', desc: 'More emails will be sent from follow-up steps.' },
  { value: 'new', title: 'Prioritise New Prospects', desc: 'More emails will be sent from the first step.' },
  { value: 'balanced', title: 'Balanced Sending', desc: 'Equal number of emails will be sent from each step.' },
  { value: 'aggressive', title: 'Aggressively Prioritise New Prospects', desc: 'Up to double budget share goes to the first step.' },
] as const;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Canned plain-text unsubscribe footers. The first entry is the default the
 * backend falls back to when no message is stored. */
const CANNED_UNSUB_MESSAGES = [
  "Reply 'Stop' if you'd prefer not to receive messages at this time.",
  "If you'd rather not hear from me again, just reply 'Stop' and I'll remove you from my list.",
  'Not interested? Reply "Stop" and I won\'t follow up again.',
  "Reply 'Unsubscribe' to opt out of future emails.",
];
const DEFAULT_DAYS = [true, true, true, true, true, false, false];
const DEFAULT_START_MIN = 540;
const DEFAULT_END_MIN = 1020;

const TIMEZONES = Array.from(
  new Set(
    [
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      'UTC',
      'Europe/London',
      'Europe/Dublin',
      'Europe/Lisbon',
      'Europe/Berlin',
      'Europe/Paris',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Zurich',
      'Europe/Stockholm',
      'Europe/Warsaw',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'America/Sao_Paulo',
      'America/Mexico_City',
      'Africa/Lagos',
      'Africa/Johannesburg',
      'Africa/Cairo',
      'Asia/Karachi',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Dhaka',
      'Asia/Jakarta',
      'Asia/Singapore',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Manila',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
    ].filter(Boolean),
  ),
);

function minutesToTime(min: number) {
  const clamped = Math.min(Math.max(min, 0), 1439);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function SequenceSettingsTab({
  sequenceId,
  sequenceName,
}: {
  sequenceId: string;
  sequenceName?: string;
}) {
  const [settings, setSettings] = useState<SequenceSettings | null>(null);
  const [schedules, setSchedules] = useState<SendingSchedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSequenceSettings(sequenceId).then(setSettings).catch((e) => setError(e.message));
    listSchedules().then(setSchedules).catch(() => undefined);
  }, [sequenceId]);

  async function save(patch: Partial<SequenceSettings>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSequenceSettings(sequenceId, patch);
      setSettings(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const activeSchedule = useMemo(
    () => schedules.find((s) => s.id === settings?.scheduleId) ?? null,
    [schedules, settings?.scheduleId],
  );

  function patchSchedule(patch: Partial<SendingSchedule>) {
    const id = settings?.scheduleId;
    if (!id) return;
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    updateSchedule(id, patch)
      .then((updated) => setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s))))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  async function enableWindow(on: boolean) {
    if (!on) {
      await save({ scheduleId: null });
      return;
    }
    if (settings?.scheduleId && schedules.some((s) => s.id === settings.scheduleId)) return;
    // Reuse a schedule already created for this sequence instead of piling up
    // duplicate "Default schedule" rows on every off→on toggle.
    const name = `${sequenceName?.trim() || 'Sequence'} — sending window`;
    const existing = schedules.find((s) => s.name === name);
    setSaving(true);
    setError(null);
    try {
      const sched =
        existing ??
        (await createSchedule({
          name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          days: DEFAULT_DAYS,
          startMin: DEFAULT_START_MIN,
          endMin: DEFAULT_END_MIN,
        }));
      if (!existing) setSchedules((prev) => [...prev, sched]);
      const updated = await updateSequenceSettings(sequenceId, { scheduleId: sched.id });
      setSettings(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) {
    return (
      <div className="max-w-[820px] rounded-md border border-danger/30 bg-danger/10 p-4 text-[13px] text-danger">
        {error}
      </div>
    );
  }
  if (!settings) return <div className="animate-pulse p-4 text-xs text-text-muted">Loading settings…</div>;

  const windowEnabled = !!settings.scheduleId;
  const unsubFormat = settings.unsubFormat ?? 'text';
  const unsubMessageIsCustom =
    settings.unsubMessage != null &&
    !CANNED_UNSUB_MESSAGES.includes(settings.unsubMessage);
  const days = activeSchedule?.days ?? DEFAULT_DAYS;
  const startMin = activeSchedule?.startMin ?? DEFAULT_START_MIN;
  const endMin = activeSchedule?.endMin ?? DEFAULT_END_MIN;
  const timezone = activeSchedule?.timezone ?? 'UTC';
  const timezoneOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  return (
    <div className="max-w-[820px] space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-faint">
          {saving ? 'Saving…' : 'Changes save automatically.'}
        </div>
        {error && (
          <div className="max-w-full truncate rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger" title={error}>
            {error}
          </div>
        )}
      </div>

      <Section
        title="Safety Settings"
      >
        <ToggleRow
          checked={settings.stopOnReply}
          onChange={(v) => save({ stopOnReply: v })}
          title="Stop sending follow-ups, if the reply is received"
          desc="It will stop sending follow-up emails once the recipient replies, so they don't get unnecessary emails and you can continue your conversation directly."
        />
        <ToggleRow
          checked={settings.trackOpen}
          onChange={(v) => save({ trackOpen: v })}
          title="Track email opens"
          desc="It lets you see if your email was opened. However, tracking emails can sometimes cause your email to end up in the “Promotions” or “Spam”."
        />
        <ToggleRow
          checked={settings.trackClick}
          onChange={(v) => save({ trackClick: v })}
          title="Track link clicks"
          desc="Tracks if the recipient clicks on any links in your email, but it could also increase the chance of your email landing in the “Promotions” or “Spam”."
        />
        <ToggleRow
          checked={settings.stripStyling}
          onChange={(v) => save({ stripStyling: v })}
          title="Remove Styling Automatically"
          desc="Send your emails without any special formatting, like colors or fonts. This makes them look more human-like and helps them land directly in the inbox."
        />
        <ToggleRow
          checked={settings.triggerOnce}
          onChange={(v) => save({ triggerOnce: v })}
          title="Only trigger one subsequence per prospect"
          desc="A prospect will enter only one matching subsequence and will never move into another subsequence of this sequence."
        />
        <div>
          <ToggleRow
            checked={settings.textOnlyMode !== 'off'}
            onChange={(v) => save({ textOnlyMode: v ? 'first_only' : 'off' })}
            title="Send emails as text only"
            desc="Plain-text emails land in the inbox more easily but skip open and link tracking."
          />
          {settings.textOnlyMode !== 'off' && (
            <div className="mt-2 flex flex-col gap-1.5 border-l-2 border-border-default pl-3">
              <RadioCard
                selected={settings.textOnlyMode === 'first_only'}
                onSelect={() => save({ textOnlyMode: 'first_only' })}
                title="Only first email"
                badge="Recommended"
                desc="Sends your first email as plain text to improve inbox placement, while still being able to include demo links in follow-ups."
              />
              <RadioCard
                selected={settings.textOnlyMode === 'all'}
                onSelect={() => save({ textOnlyMode: 'all' })}
                title="All emails"
                desc="Sends all emails as text only, without any HTML, images, or links. This helps them land in the inbox more easily."
              />
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Sending Schedule"
        hint="Decide the days and time window when this sequence may send emails."
      >
        <ToggleRow
          checked={windowEnabled}
          onChange={enableWindow}
          title="Only send during my sending window"
          desc="When off, emails may be sent at any time. When on, sends are held until the next window below."
        />
        {windowEnabled && (
          <div className="flex flex-col gap-3 border-l-2 border-border-default pl-3">
            <div>
              <FieldLabel>Days</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={days[i]}
                    onClick={() => {
                      const next = [...days];
                      next[i] = !next[i];
                      patchSchedule({ days: next });
                    }}
                    className={`h-8 w-11 rounded-md border text-xs font-medium transition-colors ${
                      days[i]
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border-strong text-text-muted hover:bg-raised'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Start time</FieldLabel>
                <input
                  type="time"
                  value={minutesToTime(startMin)}
                  onChange={(e) => patchSchedule({ startMin: timeToMinutes(e.target.value) })}
                  className={`${inputCls} w-full`}
                />
              </div>
              <div>
                <FieldLabel>End time</FieldLabel>
                <input
                  type="time"
                  value={minutesToTime(endMin)}
                  onChange={(e) => patchSchedule({ endMin: timeToMinutes(e.target.value) })}
                  className={`${inputCls} w-full`}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Timezone</FieldLabel>
              <select
                value={timezone}
                onChange={(e) => patchSchedule({ timezone: e.target.value })}
                className={`${inputCls} w-full`}
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            {!days.some(Boolean) && (
              <p className="text-[11px] text-danger">Select at least one day or emails will not be sent.</p>
            )}
          </div>
        )}
      </Section>

      <Section
        title="Sending Priority"
        hint="Decides the send order when many enrollments are due at once."
      >
        <div className="flex flex-col gap-1.5">
          {PRIORITIES.map((p) => (
            <RadioCard
              key={p.value}
              selected={settings.priority === p.value}
              onSelect={() => save({ priority: p.value })}
              title={p.title}
              desc={p.desc}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Deal Value & Verification"
        hint="Pipeline math and pre-send email checks."
      >
        <ToggleRow
          checked={settings.verifyBeforeSend}
          onChange={(v) => save({ verifyBeforeSend: v })}
          title="Verify before send"
          desc="Skips risky or undeliverable addresses instead of sending to them."
        />
      </Section>

      <Section
        title="Cc & Bcc"
        hint="Every sequence email is also sent with these recipients. Max 5 addresses each."
      >
        <div>
          <FieldLabel>Cc</FieldLabel>
          <TextField
            value={settings.cc}
            placeholder="cc@example.com, comma separated"
            className="w-full"
            onCommit={(v) => save({ cc: v.trim() || null })}
          />
        </div>
        <div>
          <FieldLabel>Bcc</FieldLabel>
          <TextField
            value={settings.bcc}
            placeholder="bcc@example.com, comma separated"
            className="w-full"
            onCommit={(v) => save({ bcc: v.trim() || null })}
          />
        </div>
      </Section>

      <Section
        title="Unsubscribe"
        hint="How prospects can opt out of this sequence."
      >
        <ToggleRow
          checked={settings.unsubFooter}
          onChange={(v) => save({ unsubFooter: v })}
          title="Include unsubscribe option in emails"
          desc="Adds an unsubscribe message or link to every email body."
        />
        {settings.unsubFooter && (
          <div className="flex flex-col gap-3 border-l-2 border-border-default pl-3">
            <div>
              <FieldLabel>Choose your “unsubscribe” format</FieldLabel>
              <div className="flex flex-col gap-1.5">
                <RadioCard
                  selected={unsubFormat === 'text'}
                  onSelect={() => save({ unsubFormat: 'text' })}
                  title="Unsubscribe as text"
                  badge="Recommended"
                  desc="Adds a plain-text unsubscribe message in your email footer."
                />
                {unsubFormat === 'text' && (
                  <div className="flex flex-col gap-1.5 border-l-2 border-border-default pl-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="radio"
                        checked={!unsubMessageIsCustom}
                        onChange={() => save({ unsubMessage: CANNED_UNSUB_MESSAGES[0] })}
                        className="mt-0.5 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-text-secondary">
                          Choose an unsubscribe message from the list
                        </span>
                      </span>
                    </label>
                    {!unsubMessageIsCustom && (
                      <select
                        value={settings.unsubMessage ?? CANNED_UNSUB_MESSAGES[0]}
                        onChange={(e) => save({ unsubMessage: e.target.value })}
                        className={`${inputCls} w-full`}
                      >
                        {CANNED_UNSUB_MESSAGES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    )}
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="radio"
                        checked={unsubMessageIsCustom}
                        onChange={() => save({ unsubMessage: '' })}
                        className="mt-0.5 accent-accent"
                      />
                      <span className="block text-xs font-medium text-text-secondary">
                        Custom message
                      </span>
                    </label>
                    {unsubMessageIsCustom && (
                      <TextField
                        value={settings.unsubMessage}
                        placeholder="Type your own unsubscribe message…"
                        className="w-full"
                        onCommit={(v) => save({ unsubMessage: v })}
                      />
                    )}
                  </div>
                )}
                <RadioCard
                  selected={unsubFormat === 'link'}
                  onSelect={() => save({ unsubFormat: 'link' })}
                  title="Unsubscribe as link"
                  desc="Adds a clickable “Unsubscribe” link in your email."
                />
              </div>
            </div>
            <ToggleRow
              checked={settings.unsubHeader}
              onChange={(v) => save({ unsubHeader: v })}
              title="Include unsubscribe in email header"
              desc="Adds an unsubscribe button at the top of the email in Gmail, Outlook, and other supported inboxes."
            />
            <div>
              <ToggleRow
                checked={settings.unsubOnReply}
                onChange={(v) => save({ unsubOnReply: v })}
                title="Automatically unsubscribe when a prospect replies"
                desc="Unsubscribes the prospect and stops their enrollments when a reply matches a keyword below."
              />
              {settings.unsubOnReply && (
                <div className="mt-2 border-l-2 border-border-default pl-3">
                  <FieldLabel>Unsubscribe keywords</FieldLabel>
                  <TextField
                    value={settings.unsubKeywords}
                    placeholder="stop"
                    className="w-full"
                    onCommit={(v) => save({ unsubKeywords: v.trim() || 'stop' })}
                  />
                  <p className="mt-1 text-[11px] text-text-faint">
                    Comma-separated words or phrases. Defaults to “stop”.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
