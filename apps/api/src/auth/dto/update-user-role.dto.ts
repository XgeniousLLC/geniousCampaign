import { IsIn } from 'class-validator';

export const USER_ROLES = ['owner', 'editor', 'viewer'] as const;

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
