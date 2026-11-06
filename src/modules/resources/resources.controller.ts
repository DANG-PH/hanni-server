import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth, Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { ResourcesService } from './resources.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được,
 * đã đăng nhập thì server biết là ai. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /resources           [khách]   Trang /hoc-lieu: danh sách học liệu
 *                                          → ResourcesService.list() · client: lib/resources.ts useResources()
 * POST      /resources/:id/link  [khách+]  Bấm mở hoặc tải 1 học liệu: kiểm quyền, trả liên kết có hạn
 *                                          → ResourcesService.link() · client: lib/resources.ts createResourceLink()
 */
@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Public()
  @Get()
  list() {
    return this.resources.list();
  }

  @OptionalAuth()
  @Post(':id/link')
  link(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.resources.link(id, user);
  }
}
