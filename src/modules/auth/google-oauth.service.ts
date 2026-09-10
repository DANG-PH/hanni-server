import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../../config/env.validation';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Xác minh Google `id_token` do frontend lấy qua Google Identity Services.
 * Chỉ cần GOOGLE_CLIENT_ID (client id là công khai) — KHÔNG cần client secret:
 * việc kiểm chữ ký JWT dùng khóa công khai của Google, ai cũng verify được.
 * Ta chỉ check thêm `aud` khớp client id của Hanni + `iss` + `exp` (lib tự lo).
 */
@Injectable()
export class GoogleOAuthService {
  private readonly client = new OAuth2Client();
  private readonly clientId: string;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get('GOOGLE_CLIENT_ID', { infer: true });
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google token không hợp lệ hoặc đã hết hạn');
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google token thiếu thông tin');
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
