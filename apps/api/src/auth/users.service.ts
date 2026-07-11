import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { users, type userRoleEnum } from '../db/schema';

type UserRole = (typeof userRoleEnum.enumValues)[number];

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  async register(email: string, password: string) {
    const existing = await this.drizzle.db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      throw new ConflictException(`A user with email "${email}" already exists`);
    }

    const anyUser = await this.drizzle.db.query.users.findFirst();
    const role: UserRole = anyUser ? 'viewer' : 'owner';

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await this.drizzle.db.insert(users).values({ email, passwordHash, role }).returning();
    return created;
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.drizzle.db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  findAll() {
    return this.drizzle.db.query.users.findMany({
      columns: { id: true, email: true, role: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.drizzle.db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async updateRole(id: string, role: UserRole) {
    await this.findOne(id);
    const [updated] = await this.drizzle.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt });
    return updated;
  }
}
