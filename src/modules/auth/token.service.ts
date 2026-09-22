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

/** Khoảng ân hạn cho refresh trùng nhau (nhiều request song song cùng xoay
 * 1 token). Ngắn vừa đủ để không thành lỗ hổng: token bị đánh cắp dùng lại
 * SAU khoảng này vẫn bị phát hiện và huỷ cả family. */
const REUSE_GRACE_MS = 30_000;

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
      // Cửa sổ ÂN HẠN cho refresh trùng nhau, KHÔNG phải token bị đánh cắp.
      //
      // Đo production 2026-09-22: 661 lần "phát hiện dùng lại" với chỉ 6 người
      // dùng thật — mỗi lần là một lần ĐĂNG XUẤT OAN. Nguyên nhân: trang
      // dashboard bắn cả chục request song song, access token hết hạn thì tất
      // cả cùng 401 rồi cùng gọi /auth/refresh với CÙNG một cookie. Request
      // đầu xoay token thành công, các request còn lại mang token vừa bị
      // revoke tới → bị coi là trộm → revoke cả family → token MỚI cũng chết
      // theo. Đây là lỗi kinh điển của refresh token rotation.
      //
      // Trong `REUSE_GRACE_MS` kể từ lúc xoay: cấp cặp mới trong CÙNG family
      // thay vì huỷ tất cả (cách Auth0/Okta gọi là "reuse interval"). Ngoài
      // cửa sổ đó vẫn xử lý như token bị đánh cắp.
      const revokedAgoMs = Date.now() - row.revokedAt.getTime();
      if (revokedAgoMs > REUSE_GRACE_MS) {
        this.logger.warn(
          `Phát hiện dùng lại refresh token (family ${row.familyId}), revoke toàn bộ family`,
        );
        await this.revokeFamily(row.familyId);
        throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ');
      }
      this.logger.debug(
        `Refresh trùng trong ${revokedAgoMs}ms (family ${row.familyId}) — cấp lại, không revoke`,
      );
      return this.issueForUser(row.user, ctx, row.familyId);
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
