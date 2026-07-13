export interface PersonalizableContact {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

const TOKEN_RE = /\{\{contact\.(firstName|lastName|email)\}\}/g;

/**
 * Resolved before spintax, never after — spintax's `{a|b}` parser mis-parses
 * a token's doubled braces as a nested spintax group otherwise (see
 * CLAUDE.md invariant 5).
 */
export function resolvePersonalization(text: string, contact: PersonalizableContact): string {
  return text.replace(TOKEN_RE, (_match, field: 'firstName' | 'lastName' | 'email') => {
    const value = contact[field];
    return value ? String(value) : '';
  });
}
