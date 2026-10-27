import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import type { Env } from '../../config/env.validation';
import { clearAuthCookies } from '../auth/cookies';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateMeDto,
  UpdateSettingsDto,
} from './dto/users.dto';
import { UserSettingsService } from './user-settings.service';
import { UsersService } from './users.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /users/me           [đăng nhập]  Hồ sơ của chính mình — client đã chuyển sang GET /auth/session, hiện
 *                                            KHÔNG trang nào gọi
 *                                            → me() → UsersService.getProfile()
 * PATCH     /users/me           [đăng nhập]  Nút "Lưu" ở /settings khi đổi múi giờ
 *                                            → updateMe() → UsersService.updateProfile()
 *                                            client: app/(app)/settings/page.tsx
 * POST      /users/me/avatar    [đăng nhập]  Tải ảnh đại diện lên ở /account, /settings
 *                                            → uploadAvatar() → UsersService.setAvatarFile()
 *                                            client: components/avatar-editor.tsx
 * DELETE    /users/me/avatar    [đăng nhập]  Nút "Xoá ảnh" đại diện ở /account, /settings
 *                                            → removeAvatar() → UsersService.clearAvatar()
 *                                            client: components/avatar-editor.tsx
 * POST      /users/me/password  [đăng nhập]  Form "Đổi mật khẩu" ở /account
 *                                            → changePassword() → UsersService.changePassword()
 *                                            client: app/(app)/account/page.tsx
 * GET       /users/me/settings  [đăng nhập]  Form cài đặt /settings (mục tiêu ngày, thuật toán SRS, giờ nhắc học…)
 *                                            → getSettings() → UserSettingsService.get()
 *                                            client: app/(app)/settings/page.tsx
 * DELETE    /users/me           [đăng nhập]  "Vùng nguy hiểm" → Xoá tài khoản ở /account
 *                                            → deleteMe() → UsersService.deleteAccount()
 *                                            client: app/(app)/account/page.tsx
 * GET       /users/:id/profile  [đăng nhập]  Hồ sơ công khai /u/[id] (bấm tên ở bảng xếp hạng)
 *                                            → getPublicProfile() → UsersService.getPublicProfile()
 *                                            client: lib/hooks.ts (usePublicProfile)
 * PATCH     /users/me/settings  [đăng nhập]  Nút "Lưu" ở /settings; đổi cấp HSK ở /learn; /bat-dau lưu cấp; nộp kết
 *                                            quả khách sau khi đăng ký
 *                                            → updateSettings() → UserSettingsService.update()
 *                                            client: app/(app)/learn/page.tsx · app/(app)/settings/page.tsx ·
 *                                                    app/bat-dau/page.tsx · lib/pending-lessons.ts
 *                                                    (drainPendingCourseLevel) · lib/pending-lessons.ts
 *                                                    (drainPendingLessons)
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly settings: UserSettingsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get cookieCfg() {
    return {
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
    };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    return this.users.setAvatarFile(user.id, file);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.users.clearAvatar(user.id);
  }

  @Post('me/password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me/settings')
  getSettings(@CurrentUser() user: AuthUser) {
    return this.settings.get(user.id);
  }

  @Delete('me')
  @HttpCode(200)
  async deleteMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.users.deleteAccount(user.id, dto.password);
    clearAuthCookies(res, this.cookieCfg);
    return { ok: true };
  }

  @Get(':id/profile')
  getPublicProfile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.getPublicProfile(id, user.id);
  }

  @Patch('me/settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settings.update(user.id, dto);
  }
}
