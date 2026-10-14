import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('inbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get('threads')
  list(
    @Query('tab') tab?: 'all' | 'unread' | 'scheduled',
    @Query('status') status?: string,
    @Query('sequenceId') sequenceId?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.inbox.listThreads({
      tab,
      status,
      sequenceId,
      q,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('unread-count')
  unreadCount() {
    return this.inbox.unreadCount();
  }

  @Get('threads/:id')
  get(@Param('id') id: string) {
    return this.inbox.getThread(id);
  }

  @Patch('threads/:id')
  @Roles('owner', 'editor')
  patch(
    @Param('id') id: string,
    @Body()
    dto: { isRead?: boolean; isStarred?: boolean; isFinished?: boolean },
  ) {
    return this.inbox.patchThread(id, dto);
  }

  @Patch('threads/:id/status')
  @Roles('owner', 'editor')
  setStatus(
    @Param('id') id: string,
    @Body()
    dto: {
      status:
        | 'uncategorized'
        | 'interested'
        | 'not_interested'
        | 'meeting_booked'
        | 'out_of_office'
        | 'closed';
    },
  ) {
    return this.inbox.setStatus(id, dto.status);
  }

  @Post('threads/:id/reply')
  @Roles('owner', 'editor')
  reply(
    @Param('id') id: string,
    @Body() dto: { html: string; text: string; cc?: string; bcc?: string },
  ) {
    return this.inbox.replyToThread(id, dto);
  }

  @Post('threads/:id/schedule')
  @Roles('owner', 'editor')
  schedule(
    @Param('id') id: string,
    @Body()
    dto: {
      html: string;
      text: string;
      cc?: string;
      bcc?: string;
      sendAt: string;
    },
  ) {
    return this.inbox.scheduleReply(id, dto);
  }

  @Get('scheduled')
  listScheduled() {
    return this.inbox.listScheduled();
  }

  @Delete('scheduled/:replyId')
  @Roles('owner', 'editor')
  cancelScheduled(@Param('replyId') replyId: string) {
    return this.inbox.cancelScheduled(replyId);
  }
}
