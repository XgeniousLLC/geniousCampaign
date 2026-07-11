const KNOWN_FIELDS = ['email', 'firstName', 'lastName'] as const;

export interface MappedContactFields {
  email?: string;
  firstName?: string;
  lastName?: string;
  customFields: Record<string, unknown>;
}

/**
 * Maps an arbitrary inbound payload to contact fields using a per-endpoint
 * fieldMapping (payloadKey -> "email" | "firstName" | "lastName" | any other
 * string, which becomes a customFields key).
 */
export function mapPayloadToContact(payload: unknown, fieldMapping: Record<string, string>): MappedContactFields {
  const result: MappedContactFields = { customFields: {} };
  if (typeof payload !== 'object' || payload === null) return result;

  const record = payload as Record<string, unknown>;

  for (const [payloadKey, contactField] of Object.entries(fieldMapping)) {
    const value = record[payloadKey];
    if (value === undefined) continue;

    if ((KNOWN_FIELDS as readonly string[]).includes(contactField)) {
      (result as unknown as Record<string, unknown>)[contactField] = String(value);
    } else {
      result.customFields[contactField] = value;
    }
  }

  return result;
}
