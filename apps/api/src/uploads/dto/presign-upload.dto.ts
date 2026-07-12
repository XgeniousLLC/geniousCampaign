import { IsIn, IsString, Matches } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export class PresignUploadDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: 'filename must be alphanumeric with . _ - only' })
  filename!: string;

  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];
}
