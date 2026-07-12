import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateCopyDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsIn(['shorter', 'casual', 'stat'])
  quickAction?: 'shorter' | 'casual' | 'stat';

  @IsOptional()
  @IsString()
  previousResult?: string;
}
