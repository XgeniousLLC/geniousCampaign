import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';

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

  async login(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    return this.buildTokenResponse(user);
  }

  private buildTokenResponse(user: { id: string; email: string; role: string }) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }
}
