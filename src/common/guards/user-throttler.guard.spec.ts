import { JwtService } from '@nestjs/jwt';
import { ACCESS_COOKIE } from '../../modules/auth/cookies';
import { UserThrottlerGuard } from './user-throttler.guard';

const SECRET = 'bi-mat-chi-dung-trong-test-1234';

function guard(scope: 'ip' | 'user') {
  const g = Object.create(UserThrottlerGuard.prototype) as UserThrottlerGuard;
  const config = {
    get: (k: string) => (k === 'THROTTLE_SCOPE' ? scope : SECRET),
  };
  Object.assign(g, { config });
  return g as unknown as { getTracker(r: unknown): Promise<string> };
}

describe('UserThrottlerGuard', () => {
  const token = new JwtService({ secret: SECRET }).sign({ sub: 'u1' });
  const req = (t?: string) => ({
    ip: '1.2.3.4',
    cookies: t ? { [ACCESS_COOKIE]: t } : {},
  });

  it('mặc định vẫn đếm theo IP như cũ', async () => {
    await expect(guard('ip').getTracker(req(token))).resolves.toBe('1.2.3.4');
  });

  it('token hợp lệ thì đếm theo tài khoản', async () => {
    await expect(guard('user').getTracker(req(token))).resolves.toBe('user:u1');
  });

  it('token giả không thoát được giới hạn theo IP', async () => {
    await expect(guard('user').getTracker(req('gia.mao.token'))).resolves.toBe(
      '1.2.3.4',
    );
  });

  it('khách không có token đếm theo IP', async () => {
    await expect(guard('user').getTracker(req())).resolves.toBe('1.2.3.4');
  });
});
