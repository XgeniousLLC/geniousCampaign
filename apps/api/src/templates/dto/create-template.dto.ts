import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subjectLines!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previewTextLines?: string[];

  @IsObject()
  bodyJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  folder?: string;
}
