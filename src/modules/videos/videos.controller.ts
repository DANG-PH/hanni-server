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

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /videos               [khách+]     Danh sách video /watch
 *                                              → list() → VideosService.list()
 *                                              client: lib/hooks.ts (useVideos)
 * GET       /videos/:id           [khách+]     Trang xem video /watch/[id] — phụ đề song ngữ, bấm từ để tra
 *                                              → get() → VideosService.get()
 *                                              client: lib/hooks.ts (useVideo)
 * PATCH     /videos/:id/progress  [đăng nhập]  Tự lưu dòng phụ đề đang xem ở /watch/[id] (để "Xem tiếp")
 *                                              → progress() → VideosService.updateProgress()
 *                                              client: app/(app)/watch/[id]/page.tsx
 */
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
