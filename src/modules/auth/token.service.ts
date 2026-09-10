import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../../config/env.validation';
import type { AccessTokenPayload } from '../../common/types';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface RefreshContext {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const REFRESH_BYTES = 48;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Quy đổi "30d" / "15m" / "3600" sang milli-giây. */
function parseDuration(input: string): number {
  const m = /^(\d+)\s*([smhd])?$/.exec(input.trim());
  if (!m) return Number(input) * 1000;
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return n * mult;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
  }

  get accessTtlMs(): number {
    return parseDuration(this.config.get('JWT_ACCESS_TTL', { infer: true }));
  }

  get refreshTtlMs(): number {
    return parseDuration(this.config.get('JWT_REFRESH_TTL', { infer: true }));
  }

  /** Phát cặp access + refresh mới. `familyId` giữ nguyên khi xoay vòng. */
  async issueForUser(
    user: { id: string; email: string; role: string },
    ctx: RefreshContext = {},
    familyId: string = randomUUID(),
  ): Promise<IssuedTokens> {
    const accessToken = this.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const raw = randomBytes(REFRESH_BYTES).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(raw),
        familyId,
        expiresAt: refreshExpiresAt,
        userAgent: ctx.userAgent?.slice(0, 255),
        ip: ctx.ip,
      },
    });

    return { accessToken, refreshToken: raw, refreshExpiresAt };
  }

  /**
   * Đổi refresh token cũ lấy cặp mới. Nếu token đã bị revoke trước đó
   * → coi là bị đánh cắp, revoke cả family.
   */
  async rotate(rawToken: string, ctx: RefreshContext): Promise<IssuedTokens> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });

    if (!row) throw new UnauthorizedException('Refresh token không hợp lệ');

    if (row.revokedAt) {
      this.logger.warn(
        `Phát hiện dùng lại refresh token (family ${row.familyId}), revoke toàn bộ family`,
      );
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    const next = await this.issueForUser(row.user, ctx, row.familyId);
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: {
        revokedAt: new Date(),
        replacedById: null, // giữ đơn giản; đủ để phát hiện reuse
      },
    });
    return next;
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
