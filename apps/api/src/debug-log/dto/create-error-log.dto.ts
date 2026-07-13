import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const ERROR_LOG_SOURCES = ['frontend', 'backend'] as const;

export class CreateErrorLogDto {
  @IsIn(ERROR_LOG_SOURCES)
  source!: (typeof ERROR_LOG_SOURCES)[number];

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
