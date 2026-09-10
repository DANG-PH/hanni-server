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
    domain: cfg.domain,
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
