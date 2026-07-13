import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { USER_ROLES } from './update-user-role.dto';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
