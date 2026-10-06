import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  IS_PUBLIC_KEY,
  OPTIONAL_AUTH_KEY,
} from '../../../common/decorators/public.decorator';
import { ACCESS_COOKIE } from '../cookies';

/** Guard mặc định toàn app. Route gắn @Public() sẽ được bỏ qua; @OptionalAuth()
 * chỉ xác thực khi request có mang token. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const flag = (key: string) =>
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (flag(OPTIONAL_AUTH_KEY)) {
      const req = context.switchToHttp().getRequest<Request>();
      const cookies = req.cookies as Record<string, string> | undefined;
      const hasToken =
        Boolean(cookies?.[ACCESS_COOKIE]) ||
        /^Bearer\s/i.test(req.headers.authorization ?? '');
      return hasToken ? super.canActivate(context) : true;
    }
    if (flag(IS_PUBLIC_KEY)) return true;
    return super.canActivate(context);
  }
}
