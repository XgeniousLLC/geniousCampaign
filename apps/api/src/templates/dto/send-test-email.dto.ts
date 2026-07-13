import { IsEmail, IsString } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;

  @IsString()
  bodyText!: string;
}
