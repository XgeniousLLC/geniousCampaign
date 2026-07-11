import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { readFile, unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { contacts } from '../../db/schema';

export interface ContactImportJobData {
  filePath: string;
  originalName: string;
}

export interface ContactImportRowError {
  row: number;
  email: string | undefined;
  error: string;
}

export interface ContactImportResult {
  totalRows: number;
  created: number;
  updated: number;
  errors: ContactImportRowError[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Processor('contact-import')
export class ContactImportProcessor extends WorkerHost {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async process(job: Job<ContactImportJobData>): Promise<ContactImportResult> {
    const fileContent = await readFile(job.data.filePath, 'utf8');
    let rows: Record<string, string>[];
    try {
      rows = parse(fileContent, { columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });
    } finally {
      await unlink(job.data.filePath).catch(() => undefined);
    }

    const result: ContactImportResult = { totalRows: rows.length, created: 0, updated: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // header is row 1
      const row = rows[i];
      const email = row.email?.trim();

      if (!email || !EMAIL_RE.test(email)) {
        result.errors.push({ row: rowNum, email, error: 'Missing or invalid email' });
        continue;
      }

      try {
        const existing = await this.drizzle.db.query.contacts.findFirst({ where: eq(contacts.email, email) });
        if (existing) {
          await this.drizzle.db
            .update(contacts)
            .set({
              firstName: row.firstname || row.first_name || existing.firstName,
              lastName: row.lastname || row.last_name || existing.lastName,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existing.id));
          result.updated++;
        } else {
          await this.drizzle.db.insert(contacts).values({
            email,
            firstName: row.firstname || row.first_name || undefined,
            lastName: row.lastname || row.last_name || undefined,
          });
          result.created++;
        }
      } catch (err) {
        result.errors.push({ row: rowNum, email, error: err instanceof Error ? err.message : 'Unknown error' });
      }

      if (i % 50 === 0) {
        await job.updateProgress(Math.round(((i + 1) / rows.length) * 100));
      }
    }

    await job.updateProgress(100);
    return result;
  }
}
