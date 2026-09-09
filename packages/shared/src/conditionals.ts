import type { PersonalizableContact } from './personalize';

function getFieldValue(field: string, contact: PersonalizableContact): string | undefined {
  const trimmed = field.trim();
  // Strip surrounding {{}} if someone wrote {{contact.xxx}} inside condition (defensive)
  const inner = trimmed.startsWith('{{') && trimmed.endsWith('}}') ? trimmed.slice(2, -2).trim() : trimmed;
  // contact.* prefix → builtin / custom lookup
  if (inner.startsWith('contact.')) {
    if (inner === 'contact.firstName') return contact.firstName ?? undefined;
    if (inner === 'contact.lastName') return contact.lastName ?? undefined;
    if (inner === 'contact.email') return contact.email ?? undefined;
    if (inner.startsWith('contact.custom.')) {
      const key = inner.slice('contact.custom.'.length);
      const map = contact.customFields as Record<string, unknown> | null | undefined;
      const v = map?.[key];
      return v != null ? String(v) : undefined;
    }
    return undefined;
  }
  // Bare identifier like "plan_id", "checkout_source" → alias to custom field
  if (/^[a-zA-Z0-9_]+$/.test(inner)) {
    const map = contact.customFields as Record<string, unknown> | null | undefined;
    const v = map?.[inner];
    return v != null ? String(v) : undefined;
  }
  return undefined;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function evaluateCondition(expr: string, contact: PersonalizableContact): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;

  // Check for == and != operators
  // Find operator outside quotes (simple)
  let op: '==' | '!=' | null = null;
  let opIndex = -1;
  // naive scan that respects quoted strings
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < trimmed.length - 1; i++) {
    const c = trimmed[i];
    const n = trimmed[i + 1];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    if (!inSingle && !inDouble) {
      if (c === '=' && n === '=') { op = '=='; opIndex = i; break; }
      if (c === '!' && n === '=') { op = '!='; opIndex = i; break; }
    }
  }

  if (op && opIndex !== -1) {
    const leftRaw = trimmed.slice(0, opIndex).trim();
    const rightRaw = trimmed.slice(opIndex + 2).trim();
    const leftVal = getFieldValue(leftRaw, contact);
    // Right side: if quoted → literal, else try field lookup then fallback to literal
    const rightIsQuoted = (rightRaw.startsWith('"') && rightRaw.endsWith('"')) || (rightRaw.startsWith("'") && rightRaw.endsWith("'"));
    let rightVal: string | undefined;
    if (rightIsQuoted) {
      rightVal = stripQuotes(rightRaw);
    } else if (/^(contact\.)/.test(rightRaw)) {
      rightVal = getFieldValue(rightRaw, contact);
      if (rightVal === undefined) rightVal = stripQuotes(rightRaw);
    } else if (/^[a-zA-Z0-9_]+$/.test(rightRaw)) {
      // Could be bare field ref or bare literal unquoted value like pricing
      // Try field first, if not found treat as literal string (covers unquoted RHS values)
      const fieldVal = getFieldValue(rightRaw, contact);
      rightVal = fieldVal !== undefined ? fieldVal : stripQuotes(rightRaw);
    } else {
      rightVal = stripQuotes(rightRaw);
    }
    const l = leftVal ?? '';
    const r = rightVal ?? '';
    return op === '==' ? l === r : l !== r;
  }

  // Truthiness check: e.g. {{#if checkout_source}} or {{#if contact.firstName}}
  const val = getFieldValue(trimmed, contact);
  return !!val && val !== '' && val !== '0' && val.toLowerCase() !== 'false';
}

/**
 * Resolves Handlebars-style conditionals in template text:
 *   {{#if <expr>}} ... {{else}} ... {{/if}}
 * Branches may contain personalization tokens / spintax which are resolved later.
 * Must run BEFORE personalize/spintax (mirrors template-resolution ordering).
 * Supports nesting and bare custom-field shorthands (plan_id → contact.custom.plan_id).
 */
export function resolveConditionals(text: string, contact: PersonalizableContact): string {
  if (!text.includes('{{#if')) return text;

  let result = text;
  const MAX_ITERATIONS = 50;
  let iterations = 0;

  // Process innermost conditional first each iteration
  while (result.includes('{{#if') && iterations < MAX_ITERATIONS) {
    iterations++;
    const closeIdx = result.indexOf('{{/if}}');
    if (closeIdx === -1) break; // unterminated, leave as-is

    const openIdx = result.lastIndexOf('{{#if', closeIdx);
    if (openIdx === -1) break;

    // Find end of opening tag: first '}}' after openIdx
    const openEnd = result.indexOf('}}', openIdx);
    if (openEnd === -1 || openEnd > closeIdx) break;

    const expr = result.slice(openIdx + '{{#if'.length, openEnd).trim();
    const innerContent = result.slice(openEnd + 2, closeIdx);

    // Split on {{else}} at this nesting level (innermost has no nested else ambiguity)
    // Since we are processing innermost, no nested conditionals remain inside innerContent,
    // so the first {{else}} is the correct split.
    const elseTag = '{{else}}';
    const elseIdx = innerContent.indexOf(elseTag);
    let thenBranch: string;
    let elseBranch: string;
    if (elseIdx !== -1) {
      thenBranch = innerContent.slice(0, elseIdx);
      elseBranch = innerContent.slice(elseIdx + elseTag.length);
    } else {
      thenBranch = innerContent;
      elseBranch = '';
    }

    const keep = evaluateCondition(expr, contact);
    const replacement = keep ? thenBranch : elseBranch;
    result = result.slice(0, openIdx) + replacement + result.slice(closeIdx + '{{/if}}'.length);
  }

  return result;
}
