export type ThreadStatus =
  | 'uncategorized'
  | 'interested'
  | 'not_interested'
  | 'meeting_booked'
  | 'out_of_office'
  | 'closed';

/** Reply subject line — adds "Re:" only when the subject doesn't already
 * carry one, so replying to an already-replied thread doesn't stack up
 * "Re: Re: Re: …". Matching is case-insensitive (RE:, re:, Re:). */
export function replySubject(subject: string | null | undefined): string {
  const base = (subject ?? '').trim();
  if (!base) return 'Re:';
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

export function stripQuoted(body: string): string {
  return body
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('>'))
    .join('\n')
    .replace(/On .* wrote:[\s\S]*$/i, '')
    .trim();
}

/** Parses a comma/newline separated keyword setting, defaulting to "stop". */
export function unsubKeywordsFrom(
  raw: string | null | undefined,
): string[] {
  const list = (raw ?? 'stop')
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : ['stop'];
}

/** True when the (quote-stripped) reply is short and contains a keyword —
 * e.g. "stop", "please stop", "STOP." — without matching prose that merely
 * happens to include the word (e.g. "I can't stop thinking about…"). */
export function replyRequestsUnsubscribe(
  body: string,
  keywords: string[],
): boolean {
  const cleaned = stripQuoted(body).trim();
  if (!cleaned) return false;
  const tokens = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length > 6) return false;
  const normalized = tokens.join(' ');
  return keywords.some((kw) =>
    kw.includes(' ') ? normalized.includes(kw) : tokens.includes(kw),
  );
}

export function classifyReply(input: {
  subject?: string;
  headers?: Record<string, string>;
  bodyText?: string;
}): { status: ThreadStatus; confidence: number } {
  const headers = Object.fromEntries(
    Object.entries(input.headers ?? {}).map(([k, v]) => [
      k.toLowerCase(),
      String(v).toLowerCase(),
    ]),
  );
  const subject = (input.subject ?? '').toLowerCase();
  const body = stripQuoted(input.bodyText ?? '').toLowerCase();
  const combined = `${subject}\n${body}`;

  if (
    headers['auto-submitted']?.includes('auto-replied') ||
    headers['x-auto-response-suppress']?.includes('oof') ||
    /automatic reply|out of office|out-of-office|\booo\b|on leave|parental leave|i am currently (away|out)/i.test(
      combined,
    )
  ) {
    return { status: 'out_of_office', confidence: 0.95 };
  }
  if (
    /not interested|no thanks|remove me|stop (emailing|contacting|mailing)|unsubscribe|no need|not a (good )?fit|pass on this/i.test(
      combined,
    )
  ) {
    return { status: 'not_interested', confidence: 0.85 };
  }
  if (
    /book (a )?call|calendly|let'?s meet|available (on|at)|works for me|see you (on|at)|schedule (a|our) (call|meeting)|tuesday|wednesday|thursday \d/i.test(
      combined,
    )
  ) {
    return { status: 'meeting_booked', confidence: 0.85 };
  }
  if (/payment done|invoice paid|deal closed|closed won/i.test(combined)) {
    return { status: 'closed', confidence: 0.8 };
  }
  if (
    /interested|tell me more|pricing|cost|quote|send (me )?(the )?(proposal|details|deck)|yes.*(call|interested)|sounds (good|great)/i.test(
      combined,
    )
  ) {
    return { status: 'interested', confidence: 0.8 };
  }
  return { status: 'uncategorized', confidence: 0.3 };
}
