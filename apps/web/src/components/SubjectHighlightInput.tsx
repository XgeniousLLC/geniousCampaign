import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export interface SubjectHighlightInputHandle {
  focus: () => void;
  insertText: (text: string) => void;
}

interface SubjectHighlightInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}

type Segment = { type: 'text'; value: string } | { type: 'token'; raw: string } | { type: 'spintax'; raw: string };

// Matches {{contact.firstName}}, {{contact.custom.foo|fallback}}, etc. — same
// shape as BUILTIN_TOKEN_RE/CUSTOM_TOKEN_RE in packages/shared/personalize.ts,
// anchored with the sticky flag so it only matches starting at lastIndex.
const TOKEN_RE = /\{\{contact\.(?:custom\.[a-zA-Z0-9_]+|firstName|lastName|email)(?:\|[^}]*)?\}\}/y;

function findGroupEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Parses raw subject text into plain/token/spintax segments for highlighting.
// A spintax group's boundaries are found by brace-depth counting, which is
// also correct for a nested token's doubled braces since '{' and '}' counts
// stay balanced either way — this only needs display ranges, not resolution.
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let literal = '';
  let i = 0;

  const flush = () => {
    if (literal) {
      segments.push({ type: 'text', value: literal });
      literal = '';
    }
  };

  while (i < text.length) {
    TOKEN_RE.lastIndex = i;
    const tokenMatch = TOKEN_RE.exec(text);
    if (tokenMatch && tokenMatch.index === i) {
      flush();
      segments.push({ type: 'token', raw: tokenMatch[0] });
      i += tokenMatch[0].length;
      continue;
    }
    if (text[i] === '{') {
      const end = findGroupEnd(text, i);
      if (end !== -1) {
        flush();
        segments.push({ type: 'spintax', raw: text.slice(i, end + 1) });
        i = end + 1;
        continue;
      }
    }
    literal += text[i];
    i++;
  }
  flush();
  return segments;
}

function getOffsets(root: HTMLElement): { start: number; end: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const len = root.textContent?.length ?? 0;
    return { start: len, end: len };
  }
  const range = sel.getRangeAt(0);
  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);
  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);
  return { start: startRange.toString().length, end: endRange.toString().length };
}

function setCaretOffset(root: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  let remaining = offset;
  let target: Node = root;
  let targetOffset = 0;

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        target = node;
        targetOffset = remaining;
        return true;
      }
      remaining -= len;
      return false;
    }
    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }
    return false;
  };
  walk(root);

  const range = document.createRange();
  range.setStart(target, targetOffset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Single-line contentEditable "input" that renders spintax groups and
// personalization tokens as pills, matching the styling TipTap's
// SpintaxBlock/PersonalizationToken nodes use in the body editor. `value`
// stays a plain string (no ProseMirror doc) — pills are CSS-only wrappers
// around the exact raw substring, so character offsets in textContent always
// match offsets in `value`, which is what makes caret save/restore safe.
export const SubjectHighlightInput = forwardRef<SubjectHighlightInputHandle, SubjectHighlightInputProps>(
  function SubjectHighlightInput({ value, onChange, placeholder, className }, ref) {
    const divRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<number | null>(null);
    const lastCaretRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      focus() {
        divRef.current?.focus();
      },
      insertText(text: string) {
        const el = divRef.current;
        const { start, end } = el ? getOffsets(el) : { start: value.length, end: value.length };
        const fallback = lastCaretRef.current;
        const useStart = start === end && start === (el?.textContent?.length ?? 0) && fallback !== null ? fallback : start;
        const useEnd = start === end && start === (el?.textContent?.length ?? 0) && fallback !== null ? fallback : end;
        const next = value.slice(0, useStart) + text + value.slice(useEnd);
        caretRef.current = useStart + text.length;
        onChange(next);
      },
    }));

    function trackCaret() {
      const el = divRef.current;
      if (!el) return;
      lastCaretRef.current = getOffsets(el).end;
    }

    function handleInput() {
      const el = divRef.current;
      if (!el) return;
      caretRef.current = getOffsets(el).end;
      onChange(el.textContent ?? '');
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key === 'Enter') e.preventDefault();
    }

    function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
      e.preventDefault();
      const el = divRef.current;
      if (!el) return;
      const text = e.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' ');
      const { start, end } = getOffsets(el);
      caretRef.current = start + text.length;
      onChange(value.slice(0, start) + text + value.slice(end));
    }

    useLayoutEffect(() => {
      const el = divRef.current;
      if (!el) return;
      el.innerHTML = '';
      for (const seg of parseSegments(value)) {
        if (seg.type === 'text') {
          el.appendChild(document.createTextNode(seg.value));
        } else if (seg.type === 'token') {
          const span = document.createElement('span');
          span.className =
            'inline-flex items-baseline rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent-light';
          span.textContent = seg.raw;
          el.appendChild(span);
        } else {
          const span = document.createElement('span');
          span.className =
            'mx-0.5 inline-flex items-baseline rounded-sm border border-dashed border-accent-light/40 bg-accent-light/10 px-2 py-0.5 text-xs font-medium text-accent-lighter';
          span.textContent = seg.raw;
          el.appendChild(span);
        }
      }
      if (caretRef.current !== null) {
        setCaretOffset(el, caretRef.current);
        caretRef.current = null;
      }
    }, [value]);

    return (
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onSelect={trackCaret}
        onKeyUp={trackCaret}
        onMouseUp={trackCaret}
        data-placeholder={placeholder}
        className={`${className ?? ''} empty:before:content-[attr(data-placeholder)] empty:before:text-text-faint`}
      />
    );
  },
);
