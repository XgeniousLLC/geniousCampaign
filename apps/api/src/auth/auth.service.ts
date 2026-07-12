import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

  private buildTokenResponse(user: { id: string; email: string; role: string }, extendExpiry?: boolean) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      extendExpiry ? { expiresIn: REMEMBER_ME_EXPIRY } : undefined,
    );
    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }
}
