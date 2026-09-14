import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import {
  ChangePasswordDto,
  SearchUsersQuery,
  UpdateMeDto,
  UpdateSettingsDto,
} from './dto/users.dto';
import { UserSettingsService } from './user-settings.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly settings: UserSettingsService,
  ) {}

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

  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query() q: SearchUsersQuery) {
    return this.users.search(user.id, q.q);
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
