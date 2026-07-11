interface ParseResult {
  node: SpintaxNode;
  nextIndex: number;
}

type SpintaxNode = SpintaxLiteral | SpintaxGroup | SpintaxSequence;

interface SpintaxLiteral {
  kind: 'literal';
  value: string;
}

interface SpintaxGroup {
  kind: 'group';
  options: SpintaxNode[];
}

interface SpintaxSequence {
  kind: 'sequence';
  parts: SpintaxNode[];
}

function parseSequence(text: string, start: number, stopChars: string): ParseResult {
  const parts: SpintaxNode[] = [];
  let literal = '';
  let i = start;

  const flushLiteral = () => {
    if (literal.length > 0) {
      parts.push({ kind: 'literal', value: literal });
      literal = '';
    }
  };

  while (i < text.length && !stopChars.includes(text[i])) {
    if (text[i] === '{') {
      flushLiteral();
      const group = parseGroup(text, i);
      parts.push(group.node);
      i = group.nextIndex;
    } else {
      literal += text[i];
      i++;
    }
  }
  flushLiteral();

  return { node: { kind: 'sequence', parts }, nextIndex: i };
}

function parseGroup(text: string, start: number): ParseResult {
  // text[start] === '{'
  let i = start + 1;
  const options: SpintaxNode[] = [];

  while (i < text.length && text[i] !== '}') {
    const seq = parseSequence(text, i, '|}');
    options.push(seq.node);
    i = seq.nextIndex;
    if (text[i] === '|') {
      i++;
    }
  }

  // skip closing '}' if present; if unterminated, treat as-is
  if (text[i] === '}') {
    i++;
  }

  return { node: { kind: 'group', options }, nextIndex: i };
}

function resolveNode(node: SpintaxNode): string {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'sequence':
      return node.parts.map(resolveNode).join('');
    case 'group': {
      if (node.options.length === 0) return '';
      const choice = node.options[Math.floor(Math.random() * node.options.length)];
      return resolveNode(choice);
    }
  }
}

/**
 * Resolves spintax syntax like "{Hi|Hello} {there|friend}, {nested {A|B}|C}"
 * into a single randomly-chosen variant. Supports arbitrarily nested groups.
 * Picks uniformly at random among each group's options.
 */
export function resolveSpintax(text: string): string {
  const { node } = parseSequence(text, 0, '');
  return resolveNode(node);
}
