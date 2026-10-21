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
