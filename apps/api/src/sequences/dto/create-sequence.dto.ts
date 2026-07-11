import { IsOptional, IsString } from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
