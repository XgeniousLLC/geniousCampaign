import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { ListsModule } from '../lists/lists.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [AuthModule, ListsModule, TagsModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
