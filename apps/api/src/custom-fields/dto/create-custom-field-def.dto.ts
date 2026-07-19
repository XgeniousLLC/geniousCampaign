import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { customFieldInputTypeEnum } from '../../db/schema';

export class CreateCustomFieldDefDto {
  @IsString()
  label!: string;

  @IsIn(customFieldInputTypeEnum.enumValues)
  inputType!: (typeof customFieldInputTypeEnum.enumValues)[number];

  @ValidateIf((dto) => dto.inputType === 'select')
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options?: string[];

  // Optional explicit key — defaults to a slug of the label when omitted.
  @IsOptional()
  @IsString()
  key?: string;
}
