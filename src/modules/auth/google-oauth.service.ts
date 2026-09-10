import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token: string;
}

/**
 * Google OAuth2 — Authorization Code flow, phía server (confidential client).
 * Không dùng passport-google-oauth20 để kiểm soát trọn vẹn state (lưu ở Redis).
 * id_token lấy trực tiếp qua kênh server-to-server TLS nên tin được mà không cần
 * verify chữ ký; ta vẫn gọi userinfo để lấy hồ sơ chuẩn hoá.
 */
@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      redirect_uri: this.config.get('GOOGLE_CALLBACK_URL', { infer: true }),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${AUTH_ENDPOINT}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
        redirect_uri: this.config.get('GOOGLE_CALLBACK_URL', { infer: true }),
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Google từ chối đổi mã: ${res.status} ${await res.text()}`,
      );
    }
    return (await res.json()) as GoogleTokenResponse;
  }

  async fetchUserInfo(accessToken: string): Promise<GoogleProfile> {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Không lấy được userinfo từ Google: ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    return {
      sub: data.sub,
      email: data.email,
      emailVerified: data.email_verified ?? false,
      name: data.name,
      picture: data.picture,
    };
  }
}
