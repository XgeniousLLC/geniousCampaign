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

  /** The template's current rendered body text (personalization tokens and
   * CTA buttons already rendered as literal `{{contact.x}}` / `Label: url`
   * text by renderBodyText) — without this, a prompt like "rewrite this
   * more professionally" has nothing to rewrite and the model just
   * describes what it would do instead of doing it. */
  @IsOptional()
  @IsString()
  context?: string;
}
