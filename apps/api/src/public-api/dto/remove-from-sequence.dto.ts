import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RemoveFromSequenceDto {
  @IsUUID()
  sequenceId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
