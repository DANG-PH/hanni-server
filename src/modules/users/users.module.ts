import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { UserSettingsService } from './user-settings.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserSettingsService, PasswordService],
  exports: [UsersService, UserSettingsService],
})
export class UsersModule {}
