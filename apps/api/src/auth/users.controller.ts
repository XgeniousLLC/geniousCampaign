import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import { AuditLogService } from './audit-log.service';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DrizzleService } from '../db/drizzle.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLog: AuditLogService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Get()
  @Roles('owner')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.drizzle.db.transaction(async (tx) => {
      const created = await this.usersService.createByAdmin(dto.email, dto.password, dto.role, dto.name, tx);
      await this.auditLog.record(user, 'user.create', 'user', created.id, { email: created.email, role: created.role }, tx);
      return created;
    });
  }

  @Patch(':id/role')
  @Roles('owner')
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto, @CurrentUser() user: AuthenticatedUser) {
    if (id === user.id) {
      throw new ForbiddenException('You cannot change your own role.');
    }
    return this.usersService.updateRole(id, dto.role);
  }
}
