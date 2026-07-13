import { IsHexColor, IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
