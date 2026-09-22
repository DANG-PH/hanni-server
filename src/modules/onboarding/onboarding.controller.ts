import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { SubmitOnboardingDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.onboarding.get(user.id);
  }

  /** Xem trước lộ trình khi CHƯA có tài khoản — xem OnboardingService.preview. */
  @Public()
  @Post('preview')
  preview(@Body() dto: SubmitOnboardingDto) {
    return this.onboarding.preview(dto);
  }

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitOnboardingDto) {
    return this.onboarding.submit(user.id, dto);
  }
}
