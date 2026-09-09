import { IsString, MinLength } from 'class-validator';

export class EnsureCustomFieldDefDto {
  @IsString()
  @MinLength(1)
  key!: string;
}
