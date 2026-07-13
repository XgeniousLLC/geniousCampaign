import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

const REMEMBER_ME_EXPIRY = '14d' as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const user = await this.usersService.register(email, password);
    return this.buildTokenResponse(user);
  }

  async login(email: string, password: string, rememberMe?: boolean) {
    const user = await this.usersService.validateCredentials(email, password);
    // Default (unchecked) keeps JwtModule's own configured expiry (7d);
    // "remember me" only ever extends it, never shortens it below that.
    return this.buildTokenResponse(user, rememberMe);
  }

  async me(userId: string) {
    const user = await this.usersService.findOne(userId);
    return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
  }

  updateProfile(userId: string, dto: { name?: string; email?: string }) {
    return this.usersService.updateProfile(userId, dto);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findOne(userId);
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.usersService.setPassword(userId, newPassword);
    return { success: true };
  }

  private buildTokenResponse(user: { id: string; email: string; role: string; name?: string | null }, extendExpiry?: boolean) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      extendExpiry ? { expiresIn: REMEMBER_ME_EXPIRY } : undefined,
    );
    return { accessToken, user: { id: user.id, email: user.email, role: user.role, name: user.name ?? null } };
  }
}
