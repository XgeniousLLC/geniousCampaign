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
import type { ColumnTarget, ContactImportJobData } from './contact-import.processor';

const VALID_TARGETS: ColumnTarget[] = ['email', 'firstName', 'lastName', 'fullName', 'custom', 'ignore'];

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

    let tagIds: string[] = [];
    if (tagIdsRaw) {
      try {
        tagIds = JSON.parse(tagIdsRaw);
      } catch {
        throw new BadRequestException('tagIds must be a valid JSON array');
      }
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
