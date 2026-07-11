import { BadRequestException, Controller, Get, NotFoundException, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ContactImportJobData } from './contact-import.processor';

@Controller('contacts/import')
export class ContactImportController {
  constructor(@InjectQueue('contact-import') private readonly queue: Queue<ContactImportJobData>) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required (multipart field "file")');
    }

    const filePath = join(tmpdir(), `contact-import-${randomUUID()}.csv`);
    await writeFile(filePath, file.buffer);

    const job = await this.queue.add('import', { filePath, originalName: file.originalname });
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
