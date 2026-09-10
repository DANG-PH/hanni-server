import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, Prisma, type User } from '@prisma/client';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface CreateUserInput {
  email: string;
  displayName: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { settings: true, streak: true, accounts: { select: { provider: true } } },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const { passwordHash, ...safe } = user;
    return { ...safe, hasPassword: Boolean(passwordHash) };
  }

  /** Tạo user kèm settings + streak mặc định trong 1 transaction. */
  async createUser(input: CreateUserInput): Promise<User> {
    const defaultTz = this.config.get('DEFAULT_USER_TIMEZONE', { infer: true });
    const newPerDay = this.config.get('SRS_DEFAULT_NEW_PER_DAY', { infer: true });
    const retention = this.config.get('SRS_DEFAULT_TARGET_RETENTION', {
      infer: true,
    });
    const scheduler = this.config.get('SRS_SCHEDULER', { infer: true });

    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash: input.passwordHash ?? null,
        avatarUrl: input.avatarUrl ?? null,
        timezone: input.timezone ?? defaultTz,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        settings: {
          create: {
            newCardsPerDay: newPerDay,
            targetRetention: retention,
            srsScheduler: scheduler,
          },
        },
        streak: { create: {} },
      },
    });
  }

  async linkOAuthAccount(
    userId: string,
    provider: AuthProvider,
    data: {
      providerAccountId: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      scope?: string;
      idToken?: string;
      tokenType?: string;
    },
  ): Promise<void> {
    const payload = {
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      scope: data.scope ?? null,
      idToken: data.idToken ?? null,
      tokenType: data.tokenType ?? null,
    } satisfies Prisma.AccountUpdateInput;

    await this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: data.providerAccountId,
        },
      },
      create: { userId, provider, providerAccountId: data.providerAccountId, ...payload },
      update: payload,
    });
  }

  findAccount(provider: AuthProvider, providerAccountId: string) {
    return this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: { user: true },
    });
  }

  async touchLastActive(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string; timezone?: string; locale?: string },
  ) {
    const user = await this.prisma.user.update({ where: { id }, data });
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
