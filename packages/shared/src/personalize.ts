export interface PersonalizableContact {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  // Freeform per-contact fields (set via import, the contact edit form, or
  // an inbound webhook field mapping) — looked up by key via the
  // {{contact.custom.<key>}} token syntax, distinct from the three built-in
  // fields above. Typed `unknown` (not Record<string, unknown>) so callers
  // can pass a Drizzle contact row straight through — the jsonb column's
  // inferred type is `unknown` at the schema level.
  customFields?: unknown;
}

// The optional `|fallback text` suffix (e.g. {{contact.firstName|there}})
// is what a token resolves to when the contact has no value for that
// field/custom key — otherwise it silently resolves to '', which reads as
// a typo in the sent email ("Hi ,") rather than a deliberate default.
const BUILTIN_TOKEN_RE = /\{\{contact\.(firstName|lastName|email)(?:\|([^}]*))?\}\}/g;
const CUSTOM_TOKEN_RE = /\{\{contact\.custom\.([a-zA-Z0-9_]+)(?:\|([^}]*))?\}\}/g;

/**
 * Resolved before spintax, never after — spintax's `{a|b}` parser mis-parses
 * a token's doubled braces as a nested spintax group otherwise (see
 * CLAUDE.md invariant 5).
 */
export function resolvePersonalization(text: string, contact: PersonalizableContact): string {
  return text
    .replace(BUILTIN_TOKEN_RE, (_match, field: 'firstName' | 'lastName' | 'email', fallback?: string) => {
      const value = contact[field];
      return value ? String(value) : (fallback ?? '');
    })
    .replace(CUSTOM_TOKEN_RE, (_match, key: string, fallback?: string) => {
      const customFields = contact.customFields as Record<string, unknown> | null | undefined;
      const value = customFields?.[key];
      return value != null ? String(value) : (fallback ?? '');
    });
}
