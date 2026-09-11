import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, VerificationTokenType } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/auth.dto';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';
import { TokenService, type IssuedTokens } from './token.service';

interface RequestCtx {
  userAgent?: string;
  ip?: string;
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function sha256(v: string): string {
  return createHash('sha256').update(v).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly google: GoogleOAuthService,
  ) {}

  // ---------- email + mật khẩu ----------

  async register(dto: RegisterDto, ctx: RequestCtx): Promise<IssuedTokens> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email đã được đăng ký');

    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.createUser({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      timezone: dto.timezone,
    });

    await this.createAndSendVerification(user.email);
    return this.tokens.issueForUser(user, ctx);
  }

  async login(
    email: string,
    password: string,
    ctx: RequestCtx,
  ): Promise<IssuedTokens> {
    const user = await this.users.findByEmail(email);
    const ok = await this.passwords.verify(password, user?.passwordHash);
    if (!user || !ok) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.tokens.issueForUser(user, ctx);
  }

  async refresh(
    rawToken: string | undefined,
    ctx: RequestCtx,
  ): Promise<IssuedTokens> {
    if (!rawToken) throw new UnauthorizedException('Thiếu refresh token');
    return this.tokens.rotate(rawToken, ctx);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.tokens.revoke(rawToken);
  }

  // ---------- xác minh email / reset mật khẩu ----------

  private async createAndSendVerification(email: string): Promise<void> {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        tokenHash: sha256(raw),
        type: VerificationTokenType.EMAIL_VERIFY,
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });
    await this.mail.sendVerifyEmail(email, raw);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const row = await this.consumeToken(
      rawToken,
      VerificationTokenType.EMAIL_VERIFY,
    );
    await this.prisma.user.updateMany({
      where: { email: row.identifier, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    // luôn trả về như nhau để không lộ email nào tồn tại
    if (!user) return;
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.verificationToken.create({
      data: {
        identifier: user.email,
        tokenHash: sha256(raw),
        type: VerificationTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    await this.mail.sendPasswordReset(user.email, raw);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const row = await this.consumeToken(
      rawToken,
      VerificationTokenType.PASSWORD_RESET,
    );
    const user = await this.users.findByEmail(row.identifier);
    if (!user) throw new BadRequestException('Token không hợp lệ');
    const hash = await this.passwords.hash(newPassword);
    await this.users.setPassword(user.id, hash);
    // vô hiệu mọi phiên cũ sau khi đổi mật khẩu
    await this.tokens.revokeAllForUser(user.id);
  }

  private async consumeToken(rawToken: string, type: VerificationTokenType) {
    const row = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!row || row.type !== type || row.consumedAt) {
      throw new BadRequestException('Token không hợp lệ hoặc đã dùng');
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token đã hết hạn');
    }
    await this.prisma.verificationToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return row;
  }

  // ---------- Google (verify id_token, không cần client secret) ----------

  async loginWithGoogle(
    idToken: string,
    ctx: RequestCtx,
  ): Promise<{ tokens: IssuedTokens; isNewUser: boolean }> {
    const profile = await this.google.verifyIdToken(idToken);

    let isNewUser = false;

    // 1) đã từng đăng nhập Google → dùng luôn
    const account = await this.users.findAccount(
      AuthProvider.GOOGLE,
      profile.sub,
    );
    let userId: string;
    if (account) {
      userId = account.userId;
    } else {
      // 2) có user cùng email → link tài khoản Google vào (chỉ khi email đã xác minh)
      const byEmail = await this.users.findByEmail(profile.email);
      if (byEmail) {
        if (!byEmail.emailVerifiedAt && !profile.emailVerified) {
          throw new BadRequestException(
            'Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu rồi liên kết Google trong phần cài đặt.',
          );
        }
        userId = byEmail.id;
      } else {
        // 3) tạo user mới
        const created = await this.users.createUser({
          email: profile.email,
          displayName: profile.name ?? profile.email.split('@')[0],
          avatarUrl: profile.picture,
          emailVerified: profile.emailVerified,
        });
        userId = created.id;
        isNewUser = true;
      }
    }

    await this.users.linkOAuthAccount(userId, AuthProvider.GOOGLE, {
      providerAccountId: profile.sub,
    });

    let user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    // Đồng bộ ảnh đại diện từ Google — trừ khi user đã tự tải ảnh riêng.
    const hasCustomAvatar =
      !!user.avatarUrl && !/googleusercontent\.com/.test(user.avatarUrl);
    if (
      profile.picture &&
      !hasCustomAvatar &&
      user.avatarUrl !== profile.picture
    ) {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: profile.picture },
      });
    }

    const tokens = await this.tokens.issueForUser(user, ctx);
    return { tokens, isNewUser };
  }
}
