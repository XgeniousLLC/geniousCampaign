import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { DrizzleService } from '../db/drizzle.service';
import { users } from '../db/schema';

describe('AuthService.login — remember me (integration, real DB)', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let drizzle: DrizzleService;
  const email = `remember-me-test-${Date.now()}@example.com`;
  const password = 'RememberMe12345';
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '7d' },
          }),
        }),
      ],
      providers: [AuthService, UsersService, DrizzleService],
    }).compile();

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    drizzle = moduleRef.get(DrizzleService);

    const usersService = moduleRef.get(UsersService);
    const created = await usersService.register(email, password);
    userId = created.id;
  });

  afterAll(async () => {
    await drizzle.db.delete(users).where(eq(users.id, userId));
  });

  it('a normal login gets the default 7-day expiry', async () => {
    const { accessToken } = await service.login(email, password);
    const decoded = jwtService.decode(accessToken) as { iat: number; exp: number };
    const lifetimeDays = (decoded.exp - decoded.iat) / (60 * 60 * 24);
    expect(lifetimeDays).toBeCloseTo(7, 0);
  });

  it('rememberMe:true gets a 14-day expiry instead', async () => {
    const { accessToken } = await service.login(email, password, true);
    const decoded = jwtService.decode(accessToken) as { iat: number; exp: number };
    const lifetimeDays = (decoded.exp - decoded.iat) / (60 * 60 * 24);
    expect(lifetimeDays).toBeCloseTo(14, 0);
  });
});
