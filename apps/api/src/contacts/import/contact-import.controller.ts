import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ListsService } from '../../lists/lists.service';
import { TagsService } from '../../tags/tags.service';
import { CONTACT_STATUSES } from '../dto/create-contact.dto';
import type { ColumnTarget, ContactImportJobData, ImportContactStatus } from './contact-import.processor';

const VALID_TARGETS: ColumnTarget[] = ['email', 'firstName', 'lastName', 'fullName', 'custom', 'ignore'];
// custom/ignore may repeat across columns; every other target is 1:1 —
// e.g. two columns both mapped to "email" is a user mistake, not a valid layout.
const SINGLE_USE_TARGETS: ColumnTarget[] = ['email', 'firstName', 'lastName', 'fullName'];

@Controller('contacts/import')
export class ContactImportController {
  constructor(
    @InjectQueue('contact-import') private readonly queue: Queue<ContactImportJobData>,
    private readonly listsService: ListsService,
    private readonly tagsService: TagsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('columnMapping') columnMappingRaw?: string,
    @Body('listId') listId?: string,
    @Body('tagIds') tagIdsRaw?: string,
    @Body('status') statusRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required (multipart field "file")');
    }

    let columnMapping: Record<string, ColumnTarget> = {};
    if (columnMappingRaw) {
      try {
        columnMapping = JSON.parse(columnMappingRaw);
      } catch {
        throw new BadRequestException('columnMapping must be valid JSON');
      }
    }
    for (const [key, target] of Object.entries(columnMapping)) {
      if (!VALID_TARGETS.includes(target)) {
        throw new BadRequestException(`Invalid mapping target "${target}" for column "${key}"`);
      }
    }
    if (!Object.values(columnMapping).includes('email')) {
      throw new BadRequestException('columnMapping must map exactly one CSV column to "email"');
    }
    for (const target of SINGLE_USE_TARGETS) {
      const columns = Object.entries(columnMapping).filter(([, t]) => t === target).map(([key]) => key);
      if (columns.length > 1) {
        throw new BadRequestException(`Multiple columns (${columns.join(', ')}) are mapped to "${target}" — each field can only be mapped once`);
      }
    }

    let tagIds: string[] = [];
    if (tagIdsRaw) {
      try {
        tagIds = JSON.parse(tagIdsRaw);
      } catch {
        throw new BadRequestException('tagIds must be a valid JSON array');
      }
    }

    if (statusRaw && !CONTACT_STATUSES.includes(statusRaw as (typeof CONTACT_STATUSES)[number])) {
      throw new BadRequestException(`Invalid status "${statusRaw}"`);
    }

    // Fail fast on a bad list/tag id rather than deep inside the queued job.
    if (listId) await this.listsService.findOne(listId);
    for (const tagId of tagIds) await this.tagsService.findOne(tagId);

    const filePath = join(tmpdir(), `contact-import-${randomUUID()}.csv`);
    await writeFile(filePath, file.buffer);

    const job = await this.queue.add('import', {
      filePath,
      originalName: file.originalname,
      columnMapping,
      listId: listId || undefined,
      tagIds,
      status: (statusRaw as ImportContactStatus) || undefined,
    });
    return { jobId: job.id };
  }

  @Get(':jobId')
  async status(@Param('jobId') jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }

    const state = await job.getState();
    return {
      jobId: job.id,
      state,
      progress: job.progress,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    };
  }
}
