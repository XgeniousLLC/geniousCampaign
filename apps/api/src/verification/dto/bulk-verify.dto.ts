import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkVerifyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
