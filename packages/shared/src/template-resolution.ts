import { resolveConditionals } from './conditionals';
import { resolvePersonalization, type PersonalizableContact } from './personalize';
import { resolveSpintax } from './spintax';

function pickRandom(lines: string[]): string {
  if (lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}

export interface ResolvableTemplate {
  subjectLines: string[];
  previewTextLines: string[];
  bodyHtml: string;
  bodyText: string;
}

export interface ResolvedTemplateContent {
  subject: string;
  previewText: string;
  bodyHtml: string;
  bodyText: string;
}

function resolveField(text: string, contact: PersonalizableContact): string {
  // Conditionals outermost (branch selection), then personalize, then spintax — preserves invariant 5 ordering
  return resolveSpintax(resolvePersonalization(resolveConditionals(text, contact), contact));
}

/**
 * Turns a template row into the exact content for one send: pick one
 * subject line and one preview-text line at random (uniform, independent of
 * each other — true A/B), then resolve conditionals → personalization → spintax
 * on every field (CLAUDE.md invariant 5, extended with conditionals as outermost).
 */
export function resolveTemplateContent(template: ResolvableTemplate, contact: PersonalizableContact): ResolvedTemplateContent {
  const subjectLine = pickRandom(template.subjectLines);
  const previewTextLine = pickRandom(template.previewTextLines);
  return {
    subject: resolveField(subjectLine, contact),
    previewText: previewTextLine ? resolveField(previewTextLine, contact) : '',
    bodyHtml: resolveField(template.bodyHtml, contact),
    bodyText: resolveField(template.bodyText, contact),
  };
}
