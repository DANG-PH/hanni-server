import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import type { Env } from '../../config/env.validation';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Xác minh Google `id_token` của web và ứng dụng native.
 * GOOGLE_CLIENT_ID + GOOGLE_MOBILE_CLIENT_IDS là danh sách audience cho phép.
 * Client ID là công khai — KHÔNG cần client secret:
 * việc kiểm chữ ký JWT dùng khóa công khai của Google, ai cũng verify được.
 * Ta chỉ check thêm `aud` khớp client id của Hanni + `iss` + `exp` (lib tự lo).
 */
@Injectable()
export class GoogleOAuthService {
  private readonly client = new OAuth2Client();
  private readonly audiences: string[];

  constructor(config: ConfigService<Env, true>) {
    this.audiences = [
      ...new Set(
        [
          config.get('GOOGLE_CLIENT_ID', { infer: true }),
          ...config.get('GOOGLE_MOBILE_CLIENT_IDS', { infer: true }).split(','),
        ]
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'Đăng nhập Google chưa thành công — thử lại nhé',
      );
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(
        'Tài khoản Google này chưa cho biết email — thử tài khoản khác nhé',
      );
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name,
      picture: payload.picture,
    };
  }
}
