import type { contacts } from '../db/schema';

/** Flattens a contact's current state into the evaluator's context shape —
 * used by schedule-based triggers (GC-036), which re-check condition trees
 * against live contact state rather than a one-shot event payload. */
export function buildContactContext(
  contact: typeof contacts.$inferSelect,
  tagNames: string[],
): Record<string, unknown> {
  return {
    contactId: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    status: contact.status,
    tags: tagNames,
    ...(contact.customFields as Record<string, unknown>),
  };
}
