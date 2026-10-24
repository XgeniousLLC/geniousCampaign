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

function textAlignDeclaration(node: ProseMirrorNode): string {
  const align = node.attrs?.textAlign;
  return typeof align === 'string' && align !== 'left' ? `text-align:${align}` : '';
}

// Email clients reset the margins of block elements in the message body
// (Gmail in particular renders `<p>one</p><p>two</p>` as two flush lines), so
// spacing that looks right in the editor collapses into one solid block on
// arrival. Only an inline style survives — a client can drop a <style> block
// but not an attribute — so every text block carries its own spacing. 16px is
// the browser default `1em` paragraph gap, so the in-app preview (a plain
// iframe with no reset) and the delivered email show the same rhythm.
const BLOCK_SPACING = 'margin:0 0 16px';

function blockStyle(node: ProseMirrorNode): string {
  const align = textAlignDeclaration(node);
  return align ? `${BLOCK_SPACING};${align}` : BLOCK_SPACING;
}

const DEFAULT_BUTTON_COLOR = '#6366F1';
const DEFAULT_BUTTON_TEXT_COLOR = '#ffffff';

function buttonStyle(color: string, textColor: string): string {
  return `display:inline-block;padding:10px 22px;background:${color};color:${textColor};border-radius:6px;text-decoration:none;font-weight:600;font-size:14px`;
}

function renderNodeHtml(node: ProseMirrorNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNodeHtml).join('');
    case 'paragraph': {
      const content = (node.content ?? []).map(renderNodeHtml).join('');
      // An empty paragraph is how a blank line is typed in the editor, and
      // Gmail drops an empty <p> outright — a non-breaking space keeps the
      // line the author actually sees.
      return `<p style="${blockStyle(node)}">${content || '&nbsp;'}</p>`;
    }
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
      return `<h${level} style="${blockStyle(node)}">${(node.content ?? []).map(renderNodeHtml).join('')}</h${level}>`;
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
      // max-width:100% keeps a large upload from overflowing the email body
      // (and the preview frame) — email clients don't constrain <img> on their
      // own, so a wide image would otherwise blow past the container edges.
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;display:block">`;
    }
    case 'ctaButton': {
      const href = typeof node.attrs?.href === 'string' ? node.attrs.href : '#';
      const text = typeof node.attrs?.text === 'string' ? node.attrs.text : '';
      const rawColor = typeof node.attrs?.color === 'string' ? node.attrs.color : DEFAULT_BUTTON_COLOR;
      const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : DEFAULT_BUTTON_COLOR;
      const rawTextColor = typeof node.attrs?.textColor === 'string' ? node.attrs.textColor : DEFAULT_BUTTON_TEXT_COLOR;
      const textColor = /^#[0-9a-fA-F]{3,8}$/.test(rawTextColor) ? rawTextColor : DEFAULT_BUTTON_TEXT_COLOR;
      return `<a href="${escapeHtml(href)}" style="${buttonStyle(color, textColor)}">${escapeHtml(text)}</a>`;
    }
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks);
    case 'personalizationToken': {
      const field = String(node.attrs?.field ?? '');
      const fallback = typeof node.attrs?.fallback === 'string' && node.attrs.fallback ? `|${escapeHtml(node.attrs.fallback)}` : '';
      return `{{${field}${fallback}}}`;
    }
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
    case 'personalizationToken': {
      const field = String(node.attrs?.field ?? '');
      const fallback = typeof node.attrs?.fallback === 'string' && node.attrs.fallback ? `|${node.attrs.fallback}` : '';
      return `{{${field}${fallback}}}`;
    }
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
