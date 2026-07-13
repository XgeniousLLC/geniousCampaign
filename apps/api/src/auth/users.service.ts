import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { users, type userRoleEnum } from '../db/schema';
import type { DbOrTx } from '../db/types';

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

  /** Owner-only admin-created member — unlike `register()`, the caller
   * picks the role explicitly rather than it being derived from
   * first-user-becomes-owner. No email is sent (this is an internal tool,
   * not an email-invite flow — invariant 11) — the owner sets the initial
   * password directly and shares it out of band. */
  async createByAdmin(email: string, password: string, role: UserRole, name?: string, db: DbOrTx = this.drizzle.db) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      throw new ConflictException(`A user with email "${email}" already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash, role, name })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt });
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
      columns: { id: true, email: true, name: true, role: true, createdAt: true },
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

  findByEmail(email: string) {
    return this.drizzle.db.query.users.findFirst({ where: eq(users.email, email) });
  }

  async setPassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.drizzle.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async updateProfile(userId: string, dto: { name?: string; email?: string }) {
    await this.findOne(userId);
    if (dto.email) {
      const existing = await this.drizzle.db.query.users.findFirst({ where: eq(users.email, dto.email) });
      if (existing && existing.id !== userId) {
        throw new ConflictException(`A user with email "${dto.email}" already exists`);
      }
    }
    const [updated] = await this.drizzle.db
      .update(users)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt });
    return updated;
  }
}
