import { IsIn } from 'class-validator';
import { ROLES } from '@genius-campaign/shared';

export const USER_ROLES = ROLES;

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
