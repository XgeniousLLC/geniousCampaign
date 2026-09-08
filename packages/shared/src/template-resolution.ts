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

/**
 * Turns a template row into the exact content for one send: pick one
 * subject line and one preview-text line at random (uniform, independent of
 * each other — true A/B), then resolve personalization tokens before
 * spintax on every field (CLAUDE.md invariant 5). The random line-pick is
 * the outer step — same ordering discipline invariant 5 already calls out
 * for a future third resolution pass.
 */
export function resolveTemplateContent(template: ResolvableTemplate, contact: PersonalizableContact): ResolvedTemplateContent {
  const subjectLine = pickRandom(template.subjectLines);
  const previewTextLine = pickRandom(template.previewTextLines);
  return {
    subject: resolveSpintax(resolvePersonalization(subjectLine, contact)),
    previewText: previewTextLine ? resolveSpintax(resolvePersonalization(previewTextLine, contact)) : '',
    bodyHtml: resolveSpintax(resolvePersonalization(template.bodyHtml, contact)),
    bodyText: resolveSpintax(resolvePersonalization(template.bodyText, contact)),
  };
}
