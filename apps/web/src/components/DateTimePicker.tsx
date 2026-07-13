import { useState } from 'react';

// Custom calendar + time picker — deliberately not `<input type="datetime-local">`.
// Native datetime-local rendering varies wildly across browsers (Chrome's
// inline spinner, Firefox's plain text segments, Safari's wheel picker) and
// needs `color-scheme: dark` just to be visible at all (GC-113 follow-up) —
// this renders identically everywhere and matches the rest of the app's
// dark theme instead of falling back to OS chrome.
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DateTimePicker({ value, onChange, min }: { value: Date | null; onChange: (date: Date) => void; min?: Date }) {
  const [open, setOpen] = useState(false);
  const base = value ?? min ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const [hour12, setHour12] = useState(value ? ((value.getHours() + 11) % 12) + 1 : 12);
  const [minute, setMinute] = useState(value ? value.getMinutes() - (value.getMinutes() % 5) : 0);
  const [isPM, setIsPM] = useState(value ? value.getHours() >= 12 : false);

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function hour24For(h12: number, pm: boolean): number {
    return pm ? (h12 % 12) + 12 : h12 % 12;
  }

  function commitDay(day: number) {
    onChange(new Date(viewYear, viewMonth, day, hour24For(hour12, isPM), minute));
  }

  function commitTime(nextHour12: number, nextMinute: number, nextIsPM: boolean) {
    setHour12(nextHour12);
    setMinute(nextMinute);
    setIsPM(nextIsPM);
    if (value) {
      onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), hour24For(nextHour12, nextIsPM), nextMinute));
    }
  }

  function isDisabled(day: number): boolean {
    if (!min) return false;
    return new Date(viewYear, viewMonth, day, 23, 59, 59) < min;
  }

  function isSelected(day: number): boolean {
    return !!value && value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const total = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const label = value
    ? value.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Select date & time';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-full rounded-md border border-border-subtle bg-surface px-2.5 text-left text-xs text-text-primary"
      >
        {label}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-[70] cursor-default bg-transparent" />
          <div
            className="absolute left-0 top-full z-[71] mt-1.5 w-64 rounded-md border border-border-modal bg-panel2 p-3 shadow-2xl"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} className="h-6 w-6 rounded text-text-secondary hover:bg-raised">
                ‹
              </button>
              <div className="text-xs font-medium text-text-primary">
                {MONTHS[viewMonth]} {viewYear}
              </div>
              <button type="button" onClick={() => shiftMonth(1)} className="h-6 w-6 rounded text-text-secondary hover:bg-raised">
                ›
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] text-text-faint">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) =>
                day === null ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled(day)}
                    onClick={() => commitDay(day)}
                    className={`h-7 rounded text-[11px] ${
                      isSelected(day)
                        ? 'bg-accent text-white'
                        : isDisabled(day)
                          ? 'cursor-not-allowed text-text-faint opacity-40'
                          : 'text-text-secondary hover:bg-raised'
                    }`}
                  >
                    {day}
                  </button>
                ),
              )}
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3">
              <select
                value={hour12}
                onChange={(e) => commitTime(Number(e.target.value), minute, isPM)}
                className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-1 text-xs text-text-primary"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => commitTime(hour12, Number(e.target.value), isPM)}
                className="h-8 flex-1 rounded-md border border-border-subtle bg-surface px-1 text-xs text-text-primary"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <select
                value={isPM ? 'PM' : 'AM'}
                onChange={(e) => commitTime(hour12, minute, e.target.value === 'PM')}
                className="h-8 w-16 rounded-md border border-border-subtle bg-surface px-1 text-xs text-text-primary"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2.5 h-7 w-full rounded-md border border-border-subtle text-[11px] font-medium text-text-secondary hover:bg-raised"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
