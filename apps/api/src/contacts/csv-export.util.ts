// Shared CSV building for contact exports (the per-list export in
// ListsService and the filtered contacts export in ContactsService) —
// one place for escaping and column layout so both files stay
// re-importable through the CSV import's column-mapping step.
export function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'list';
}

export interface CsvContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  customFields: Record<string, unknown> | null;
  tags: { name: string }[];
  lists: { name: string }[];
  /** ISO timestamp string — the caller decides the semantics (list-join
   * date vs contact creation date); the header is named via `dateHeader`. */
  dateValue: string;
}

/** Base columns are stable (email, first_name, last_name, status, tags,
 * [lists,] <dateHeader>); every customFields key present on any row
 * becomes an extra column (sorted) so no data is dropped. */
export function buildContactsCsv(rows: CsvContact[], opts: { includeListsColumn: boolean; dateHeader: string }): string {
  const customKeys = [...new Set(rows.flatMap((r) => Object.keys(r.customFields ?? {})))].sort();

  const header = [
    'email',
    'first_name',
    'last_name',
    'status',
    'tags',
    ...(opts.includeListsColumn ? ['lists'] : []),
    opts.dateHeader,
    ...customKeys,
  ];
  const lines = [header.map(escapeCsvCell).join(',')];
  for (const r of rows) {
    const custom = r.customFields ?? {};
    const cells = [
      r.email,
      r.firstName ?? '',
      r.lastName ?? '',
      r.status,
      r.tags.map((t) => t.name).join('; '),
      ...(opts.includeListsColumn ? [r.lists.map((l) => l.name).join('; ')] : []),
      r.dateValue,
      ...customKeys.map((k) => {
        const v = custom[k];
        return v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v);
      }),
    ];
    lines.push(cells.map(escapeCsvCell).join(','));
  }

  return lines.join('\n') + '\n';
}
