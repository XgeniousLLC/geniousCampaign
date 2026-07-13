// Rebuilds a ProseMirror doc from AI-rewritten plain text. The AI only ever
// sees literal text (renderBodyText turns a personalizationToken node into
// `{{contact.x}}`, a ctaButton node into `Label: url`, and a spintaxBlock
// node into `{option A|option B}`), so this reverses all three: otherwise a
// rewrite would silently flatten every token/button/spintax group into dead
// text the moment it round-trips through the AI.

const BUTTON_LINE_RE = /^(.+?):\s*(https?:\/\/\S+|#)\s*$/;
// Alternation order matters: the token branch is tried first so a real
// `{{contact.x}}` token is never mistaken for a single-brace spintax group.
const INLINE_RE = /\{\{contact\.(firstName|lastName|email)\}\}|\{([^{}]*\|[^{}]*(?:\|[^{}]*)*)\}/g;

const TOKEN_LABELS: Record<string, string> = {
  'contact.firstName': 'First name',
  'contact.lastName': 'Last name',
  'contact.email': 'Email',
};

function lineToInlineContent(line: string): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  let lastIndex = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(line))) {
    if (match.index > lastIndex) parts.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    if (match[1]) {
      const field = `contact.${match[1]}`;
      parts.push({ type: 'personalizationToken', attrs: { field, label: TOKEN_LABELS[field] ?? field } });
    } else {
      const options = match[2].split('|').map((o) => o.trim());
      parts.push({ type: 'spintaxBlock', attrs: { options } });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) parts.push({ type: 'text', text: line.slice(lastIndex) });
  return parts.length > 0 ? parts : [{ type: 'text', text: line }];
}

export function aiTextToDoc(text: string): { type: 'doc'; content: Array<Record<string, unknown>> } {
  const lines = text.split('\n');
  const content: Array<Record<string, unknown>> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const buttonMatch = line.match(BUTTON_LINE_RE);
    if (buttonMatch) {
      content.push({ type: 'ctaButton', attrs: { text: buttonMatch[1].trim(), href: buttonMatch[2] } });
      continue;
    }

    content.push({ type: 'paragraph', content: lineToInlineContent(line) });
  }

  if (content.length === 0) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}
