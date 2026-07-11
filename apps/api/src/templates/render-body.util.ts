interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyMarks(html: string, marks: ProseMirrorMark[] = []): string {
  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return `<strong>${acc}</strong>`;
      case 'italic':
        return `<em>${acc}</em>`;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        return `<a href="${escapeHtml(href)}">${acc}</a>`;
      }
      default:
        return acc;
    }
  }, html);
}

function renderNodeHtml(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNodeHtml).join('');
    case 'paragraph':
      return `<p>${(node.content ?? []).map(renderNodeHtml).join('')}</p>`;
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
      return `<h${level}>${(node.content ?? []).map(renderNodeHtml).join('')}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNodeHtml).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNodeHtml).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNodeHtml).join('')}</li>`;
    case 'hardBreak':
      return '<br>';
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks);
    default:
      return (node.content ?? []).map(renderNodeHtml).join('');
  }
}

function renderNodeText(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNodeText).join('\n');
    case 'paragraph':
    case 'heading':
      return (node.content ?? []).map(renderNodeText).join('');
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? []).map(renderNodeText).join('\n');
    case 'listItem':
      return `- ${(node.content ?? []).map(renderNodeText).join('')}`;
    case 'hardBreak':
      return '\n';
    case 'text':
      return node.text ?? '';
    default:
      return (node.content ?? []).map(renderNodeText).join('');
  }
}

export function renderBodyHtml(bodyJson: ProseMirrorNode): string {
  return renderNodeHtml(bodyJson);
}

export function renderBodyText(bodyJson: ProseMirrorNode): string {
  return renderNodeText(bodyJson).trim();
}
