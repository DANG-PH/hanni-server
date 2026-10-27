import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import type { Env } from '../../config/env.validation';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies';
import {
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { UsersService } from '../users/users.service';
import { TokenService, type IssuedTokens } from './token.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * POST      /auth/register         [khách]      Form "Tạo tài khoản" ở /register (và màn đăng ký sau khi học thử)
 *                                               → register() → AuthService.register()
 *                                               client: components/auth-form-card.tsx
 * POST      /auth/login            [khách]      Form "Đăng nhập" ở /login
 *                                               → login() → AuthService.login()
 *                                               client: components/auth-form-card.tsx
 * GET       /auth/session          [khách+]     Mỗi lần mở app: hỏi "ai đang đăng nhập" (AuthProvider ở lib/auth.tsx)
 *                                               — khách nhận { user: null }
 *                                               → session() → UsersService.getProfile()
 *                                               client: lib/api.ts (apiFetch) · lib/auth.tsx (AuthProvider)
 * POST      /auth/refresh          [khách]      Tự động khi access token hết hạn (lib/api.ts gộp chung 1 lượt cho mọi
 *                                               request đang chờ)
 *                                               → refresh() → AuthService.refresh()
 *                                               client: lib/api.ts (refreshSession)
 * POST      /auth/logout           [khách]      Nút "Đăng xuất" ở chân menu
 *                                               → logout() → AuthService.logout()
 *                                               client: lib/auth.tsx (AuthProvider)
 * POST      /auth/google           [khách]      Nút "Đăng nhập bằng Google" ở /login, /register
 *                                               → google() → AuthService.loginWithGoogle()
 *                                               client: components/google-button.tsx
 * POST      /auth/verify-email     [khách]      Bấm link xác minh trong email → trang /auth/verify-email
 *                                               → verifyEmail() → AuthService.verifyEmail()
 *                                               client: app/auth/verify-email/page.tsx
 * POST      /auth/forgot-password  [khách]      Form "Quên mật khẩu" ở /forgot-password (cần MAIL_HOST mới gửi được
 *                                               email thật)
 *                                               → forgotPassword() → AuthService.forgotPassword()
 *                                               client: app/forgot-password/page.tsx
 * POST      /auth/reset-password   [khách]      Form đặt mật khẩu mới ở /reset-password (mở từ link trong email)
 *                                               → resetPassword() → AuthService.resetPassword()
 *                                               client: app/reset-password/page.tsx
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get cookieCfg() {
    return {
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
    };
  }

  private send(res: Response, tokens: IssuedTokens): void {
    setAuthCookies(
      res,
      tokens,
      {
        accessMs: this.tokens.accessTtlMs,
        refreshMs: this.tokens.refreshTtlMs,
      },
      this.cookieCfg,
    );
  }

  private ctx(req: Request) {
    return {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto, this.ctx(req));
    this.send(res, tokens);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(
      dto.email,
      dto.password,
      this.ctx(req),
    );
    this.send(res, tokens);
    return { ok: true };
  }

  /** Ai đang đăng nhập — client gọi mỗi lần mở app. Khách nhận `{ user: null }` (200): trước đây client gọi `/users/me`
   * rồi `/auth/refresh`, khách nào mở trang cũng dính 2 lỗi 401 trong console và chờ thêm 2 lượt mạng. Phiên hết hạn mà
   * còn cookie làm mới (cookie đó chỉ gửi tới `/api/auth/*`, nên route phải nằm ở đây) → 401 để client làm mới rồi hỏi lại. */
  @OptionalAuth()
  @Get('session')
  async session(
    @CurrentUser() user: AuthUser | undefined,
    @Req() req: Request,
  ) {
    if (user) return { user: await this.users.getProfile(user.id) };
    if ((req.cookies as Record<string, string>)?.[REFRESH_COOKIE])
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    return { user: null };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const tokens = await this.auth.refresh(raw, this.ctx(req));
    this.send(res, tokens);
    return { ok: true };
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    await this.auth.logout(raw);
    clearAuthCookies(res, this.cookieCfg);
    return { ok: true };
  }

  // ---------- Google: frontend gửi id_token, backend verify (không cần secret) ----------

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('google')
  async google(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, isNewUser } = await this.auth.loginWithGoogle(
      dto.idToken,
      this.ctx(req),
    );
    this.send(res, tokens);
    return { ok: true, isNewUser };
  }

  // ---------- xác minh / reset ----------

  @Public()
  @HttpCode(200)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }
}
