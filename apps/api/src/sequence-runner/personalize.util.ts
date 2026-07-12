interface PersonalizableContact {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

const TOKEN_RE = /\{\{contact\.(firstName|lastName|email)\}\}/g;

export function resolvePersonalization(text: string, contact: PersonalizableContact): string {
  return text.replace(TOKEN_RE, (_match, field: 'firstName' | 'lastName' | 'email') => {
    const value = contact[field];
    return value ? String(value) : '';
  });
}
