import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Env } from '../../config/env.validation';
import { ACCESS_COOKIE } from '../../modules/auth/cookies';

/**
 * THROTTLE_SCOPE=user: đã đăng nhập thì đếm theo tài khoản. Cả phòng máy chung 1 IP sau NAT không còn bị chặn oan.
 * Phải kiểm CHỮ KÝ token: dùng cookie thô làm khoá thì kẻ tấn công đổi cookie ngẫu nhiên là thoát mọi giới hạn.
 * Token sai hoặc hết hạn thì quay về đếm theo IP.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  @Inject(ConfigService) private readonly config!: ConfigService<Env, true>;
  private verifier?: JwtService;

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    if (this.config.get('THROTTLE_SCOPE', { infer: true }) === 'user') {
      // Lúc đăng nhập chưa có tài khoản để đếm: theo IP thì cả phòng máy chung 1 hạn mức 10 lượt/phút. Đếm theo IP + email
      // vẫn chặn được dò mật khẩu 1 tài khoản, đổi lại không chặn được dò nhiều tài khoản từ 1 IP.
      const email = (req.body as { email?: unknown } | undefined)?.email;
      if (
        typeof email === 'string' &&
        String(req.originalUrl).endsWith('/auth/login')
      ) {
        return `login:${await super.getTracker(req)}:${email.toLowerCase()}`;
      }
      const cookies = req.cookies as Record<string, string> | undefined;
      const token = cookies?.[ACCESS_COOKIE];
      if (token) {
        this.verifier ??= new JwtService({
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        });
        const payload = await this.verifier
          .verifyAsync<{ sub?: string }>(token)
          .catch(() => null);
        if (payload?.sub) return `user:${payload.sub}`;
      }
    }
    return super.getTracker(req);
  }
}
