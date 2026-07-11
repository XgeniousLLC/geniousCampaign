import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const LIST_TYPES = ['static', 'dynamic'] as const;

export class CreateListDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsIn(LIST_TYPES)
  type?: (typeof LIST_TYPES)[number];

  @IsOptional()
  @IsObject()
  filterDefinition?: Record<string, unknown>;
}
