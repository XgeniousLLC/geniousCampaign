import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { readFile, unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { ListsService } from '../../lists/lists.service';
import { TagsService } from '../../tags/tags.service';
import { contacts } from '../../db/schema';

export type ColumnTarget = 'email' | 'firstName' | 'lastName' | 'fullName' | 'custom' | 'ignore';

export interface ContactImportJobData {
  filePath: string;
  originalName: string;
  // Keyed by the lowercased/trimmed CSV header (matches csv-parse's `columns`
  // header transform below), so a row's raw key always matches a mapping key.
  columnMapping: Record<string, ColumnTarget>;
  listId?: string;
  tagIds?: string[];
}

export interface ContactImportRowIssue {
  row: number;
  email?: string;
  reason: string;
  type: 'invalid' | 'error';
}

export interface ContactImportProgress {
  percent: number;
  processed: number;
  total: number;
  created: number;
  duplicates: number;
  invalid: number;
}

export interface ContactImportResult {
  totalRows: number;
  created: number;
  duplicates: number;
  invalid: number;
  // Capped detail list for display — counts above are always exact even
  // when there are more issues than fit here.
  issues: ContactImportRowIssue[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ISSUES = 500;

@Processor('contact-import')
export class ContactImportProcessor extends WorkerHost {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly listsService: ListsService,
    private readonly tagsService: TagsService,
  ) {
    super();
  }

  async process(job: Job<ContactImportJobData>): Promise<ContactImportResult> {
    const { columnMapping, listId, tagIds = [] } = job.data;
    const fileContent = await readFile(job.data.filePath, 'utf8');
    let rows: Record<string, string>[];
    try {
      rows = parse(fileContent, { columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });
    } finally {
      await unlink(job.data.filePath).catch(() => undefined);
    }

    const result: ContactImportResult = { totalRows: rows.length, created: 0, duplicates: 0, invalid: 0, issues: [] };
    const emailColumn = Object.keys(columnMapping).find((key) => columnMapping[key] === 'email');
    const firstNameColumn = Object.keys(columnMapping).find((key) => columnMapping[key] === 'firstName');
    const lastNameColumn = Object.keys(columnMapping).find((key) => columnMapping[key] === 'lastName');
    const fullNameColumn = Object.keys(columnMapping).find((key) => columnMapping[key] === 'fullName');
    const customColumns = Object.keys(columnMapping).filter((key) => columnMapping[key] === 'custom');

    // Fetched once outside the per-row loop — addContactSilent() would
    // otherwise re-look these up on every single row.
    const listName = listId ? (await this.listsService.findOne(listId)).name : undefined;
    const tagNames = new Map<string, string>();
    for (const tagId of tagIds) tagNames.set(tagId, (await this.tagsService.findOne(tagId)).name);

    // Update cadence scales with file size — ~200 updates over the whole
    // run regardless of whether it's 100 rows or 10,000, so progress still
    // feels real-time on a big import without hammering Redis on a small one.
    const updateEvery = Math.max(1, Math.floor(rows.length / 200));

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // header is row 1
      const row = rows[i];
      const email = emailColumn ? row[emailColumn]?.trim() : undefined;

      if (!email || !EMAIL_RE.test(email)) {
        result.invalid++;
        if (result.issues.length < MAX_ISSUES) {
          result.issues.push({ row: rowNum, email, reason: 'Missing or invalid email', type: 'invalid' });
        }
        continue;
      }

      let firstName = firstNameColumn ? row[firstNameColumn]?.trim() || undefined : undefined;
      let lastName = lastNameColumn ? row[lastNameColumn]?.trim() || undefined : undefined;
      if (fullNameColumn) {
        const fullName = row[fullNameColumn]?.trim();
        if (fullName) {
          const spaceIdx = fullName.indexOf(' ');
          if (spaceIdx === -1) {
            firstName = firstName ?? fullName;
          } else {
            firstName = firstName ?? fullName.slice(0, spaceIdx);
            lastName = lastName ?? fullName.slice(spaceIdx + 1).trim();
          }
        }
      }
      const customFields: Record<string, string> = {};
      for (const col of customColumns) {
        if (row[col]) customFields[col] = row[col];
      }

      try {
        const existing = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.email, email) });
        let contactId: string;
        if (existing) {
          await this.drizzle.db
            .update(contacts)
            .set({
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              customFields: { ...(existing.customFields as Record<string, unknown>), ...customFields },
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existing.id));
          contactId = existing.id;
          result.duplicates++;
        } else {
          const [created] = await this.drizzle.db.insert(contacts).values({ email, firstName, lastName, customFields }).returning();
          contactId = created.id;
          result.created++;
        }

        if (listId) await this.listsService.addContactSilent(listId, contactId, listName);
        for (const tagId of tagIds) await this.tagsService.addContactSilent(tagId, contactId, tagNames.get(tagId));
      } catch (err) {
        if (result.issues.length < MAX_ISSUES) {
          result.issues.push({ row: rowNum, email, reason: err instanceof Error ? err.message : 'Unknown error', type: 'error' });
        }
      }

      if (i % updateEvery === 0 || i === rows.length - 1) {
        const processed = i + 1;
        await job.updateProgress({
          percent: Math.round((processed / rows.length) * 100),
          processed,
          total: rows.length,
          created: result.created,
          duplicates: result.duplicates,
          invalid: result.invalid,
        } satisfies ContactImportProgress);
      }
    }

    return result;
  }
}
