import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'hanni_access';
export const REFRESH_COOKIE = 'hanni_refresh';

interface CookieConfig {
  domain: string;
  secure: boolean;
}

function base(cfg: CookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: 'lax',
    // Bỏ thuộc tính Domain khi là localhost: cookie thành host-only cho host
    // "localhost" (không phụ thuộc cổng) → gửi được từ client :3000 sang API :8000,
    // đồng thời tránh việc trình duyệt từ chối `Domain=localhost`.
    ...(cfg.domain && cfg.domain !== 'localhost' ? { domain: cfg.domain } : {}),
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  ttl: { accessMs: number; refreshMs: number },
  cfg: CookieConfig,
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(cfg),
    maxAge: ttl.accessMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(cfg),
    // refresh chỉ cần gửi tới nhánh /auth
    path: '/api/auth',
    maxAge: ttl.refreshMs,
  });
}

export function clearAuthCookies(res: Response, cfg: CookieConfig): void {
  res.clearCookie(ACCESS_COOKIE, base(cfg));
  res.clearCookie(REFRESH_COOKIE, { ...base(cfg), path: '/api/auth' });
}
