import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { VideoProgressDto, VideoQueryDto } from './dto/videos.dto';
import { VideosService } from './videos.service';

@ApiTags('videos')
@ApiBearerAuth()
@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  /** Khách xem được kho video + bản chép (như Hanzii/Hanbeego), chỉ tiến độ
   * và lượt thích mới cần tài khoản. */
  @OptionalAuth()
  @Get()
  list(@CurrentUser() user: AuthUser | undefined, @Query() q: VideoQueryDto) {
    return this.videos.list(user?.id ?? null, q);
  }

  @OptionalAuth()
  @Get(':id')
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.videos.get(user?.id ?? null, id);
  }

  @Patch(':id/progress')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VideoProgressDto,
  ) {
    return this.videos.updateProgress(user.id, id, dto);
  }
}
