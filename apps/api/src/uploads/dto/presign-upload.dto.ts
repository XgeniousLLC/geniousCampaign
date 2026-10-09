import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export class PresignUploadDto {
  // The filename is never used as the object key (R2 key is a random UUID +
  // extension) — it only supplies the extension. So accept real browser
  // filenames ("KF 5.jpg", "photo (1).png") and just block path traversal.
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^[^\\/]+$/, { message: 'filename must not contain path separators' })
  filename!: string;

  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];
}
