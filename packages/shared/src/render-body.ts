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
      case 'underline':
        return `<u>${acc}</u>`;
      case 'strike':
        return `<s>${acc}</s>`;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        return `<a href="${escapeHtml(href)}">${acc}</a>`;
      }
      default:
        return acc;
    }
  }, html);
}

function textAlignStyle(node: ProseMirrorNode): string {
  const align = node.attrs?.textAlign;
  return typeof align === 'string' && align !== 'left' ? ` style="text-align:${align}"` : '';
}

const BUTTON_STYLE =
  'display:inline-block;padding:10px 22px;background:#6366F1;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px';

function renderNodeHtml(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNodeHtml).join('');
    case 'paragraph':
      return `<p${textAlignStyle(node)}>${(node.content ?? []).map(renderNodeHtml).join('')}</p>`;
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
      return `<h${level}${textAlignStyle(node)}>${(node.content ?? []).map(renderNodeHtml).join('')}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNodeHtml).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNodeHtml).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNodeHtml).join('')}</li>`;
    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderNodeHtml).join('')}</blockquote>`;
    case 'horizontalRule':
      return '<hr>';
    case 'hardBreak':
      return '<br>';
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`;
    }
    case 'ctaButton': {
      const href = typeof node.attrs?.href === 'string' ? node.attrs.href : '#';
      const text = typeof node.attrs?.text === 'string' ? node.attrs.text : '';
      return `<a href="${escapeHtml(href)}" style="${BUTTON_STYLE}">${escapeHtml(text)}</a>`;
    }
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks);
    case 'personalizationToken':
      return `{{${String(node.attrs?.field ?? '')}}}`;
    case 'spintaxBlock':
      return `{${((node.attrs?.options as string[]) ?? []).map(escapeHtml).join('|')}}`;
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
    case 'blockquote':
      return `> ${(node.content ?? []).map(renderNodeText).join('')}`;
    case 'horizontalRule':
      return '---';
    case 'hardBreak':
      return '\n';
    case 'image':
      return typeof node.attrs?.alt === 'string' && node.attrs.alt ? `[image: ${node.attrs.alt}]` : '[image]';
    case 'ctaButton': {
      const text = typeof node.attrs?.text === 'string' ? node.attrs.text : '';
      const href = typeof node.attrs?.href === 'string' ? node.attrs.href : '';
      return `${text}: ${href}`;
    }
    case 'text':
      return node.text ?? '';
    case 'personalizationToken':
      return `{{${String(node.attrs?.field ?? '')}}}`;
    case 'spintaxBlock':
      return `{${((node.attrs?.options as string[]) ?? []).join('|')}}`;
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
