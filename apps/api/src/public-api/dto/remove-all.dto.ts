import { IsOptional, IsString } from 'class-validator';

export class RemoveAllDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
