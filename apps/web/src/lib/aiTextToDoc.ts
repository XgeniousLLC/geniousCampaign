// Rebuilds a ProseMirror doc from AI-rewritten plain text. The AI only ever
// sees literal text (renderBodyText turns a personalizationToken node into
// `{{contact.x}}`, a ctaButton node into `Label: url`, and a spintaxBlock
// node into `{option A|option B}`), so this reverses all three: otherwise a
// rewrite would silently flatten every token/button/spintax group into dead
// text the moment it round-trips through the AI.

const BUTTON_LINE_RE = /^(.+?):\s*(https?:\/\/\S+|#)\s*$/;
const TOKEN_FIELD_RE = /^contact\.(firstName|lastName|email|custom\.[a-zA-Z0-9_]+)$/;

const TOKEN_LABELS: Record<string, string> = {
  'contact.firstName': 'First name',
  'contact.lastName': 'Last name',
  'contact.email': 'Email',
};

// A single regex can't express this: a spintax group's options are plain
// strings (SpintaxBlock's schema has no room for a real token node inside
// one), and the AI is free to put a token inside a spin option (e.g.
// "{Hi {{contact.firstName}}|Hello {{contact.firstName}}}" to vary the
// greeting word while keeping the name every time) — so a spintax group's
// closing brace must be found by walking the string and skipping over any
// nested `{{...}}` token pair, not by forbidding braces inside it outright.
// Once found, the raw inner text (tokens included, verbatim) becomes the
// option strings directly — resolvePersonalization runs before
// resolveSpintax at send time (invariant 5), so a token left as literal
// text inside an option resolves correctly either way.
function lineToInlineContent(line: string): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) {
      parts.push({ type: 'text', text: buf });
      buf = '';
    }
  };

  while (i < line.length) {
    if (line.startsWith('{{', i)) {
      const end = line.indexOf('}}', i + 2);
      const inner = end !== -1 ? line.slice(i + 2, end) : '';
      // inner may carry a `|fallback text` suffix (e.g.
      // "contact.firstName|there") — split it off before matching the
      // field itself against the known-token pattern.
      const pipeIdx = inner.indexOf('|');
      const field = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
      const fallback = pipeIdx === -1 ? undefined : inner.slice(pipeIdx + 1);
      if (end !== -1 && TOKEN_FIELD_RE.test(field)) {
        flush();
        parts.push({ type: 'personalizationToken', attrs: { field, label: TOKEN_LABELS[field] ?? field, fallback } });
        i = end + 2;
        continue;
      }
    }

    if (line[i] === '{' && line[i + 1] !== '{') {
      let depth = 1;
      let j = i + 1;
      while (j < line.length && depth > 0) {
        if (line.startsWith('{{', j)) {
          const tokenEnd = line.indexOf('}}', j + 2);
          if (tokenEnd !== -1) {
            j = tokenEnd + 2;
            continue;
          }
        }
        if (line[j] === '{') depth++;
        else if (line[j] === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      if (depth === 0) {
        const inner = line.slice(i + 1, j);
        if (inner.includes('|')) {
          flush();
          parts.push({ type: 'spintaxBlock', attrs: { options: inner.split('|').map((o) => o.trim()) } });
          i = j + 1;
          continue;
        }
      }
    }

    buf += line[i];
    i++;
  }
  flush();

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
