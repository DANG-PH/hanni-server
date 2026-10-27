import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { GrammarService } from './grammar.service';

class GrammarQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;
}

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /grammar         [khách]      Danh sách ngữ pháp /ngu-phap (+ sitemap)
 *                                         → list() → GrammarService.list()
 *                                         client: app/(site)/ngu-phap/page.tsx · app/sitemap.ts
 * GET       /grammar/search  [khách]      Tab "Ngữ pháp" của kết quả tra /tu-dien?q=…&tab=ngu-phap
 *                                         → search() → GrammarService.search()
 *                                         client: app/(site)/tu-dien/page.tsx
 * GET       /grammar/:slug   [khách]      Trang 1 điểm ngữ pháp /ngu-phap/[slug]
 *                                         → get() → GrammarService.get()
 *                                         client: app/(site)/ngu-phap/[slug]/page.tsx
 */
@ApiTags('grammar')
@ApiBearerAuth()
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}

  /** Công khai như `/words`: 235 điểm ngữ pháp có giải thích soạn tay là tài
   * sản hiếm nhất của Hanni, cạnh tranh SEO lại thấp hơn từ vựng nhiều
   * ("cách dùng 把", "phân biệt 了 và 过" ít trang tiếng Việt chất lượng).
   * Giấu sau đăng nhập thì Google không bao giờ thấy. */
  @Public()
  @Get()
  list(@Query() q: GrammarQuery) {
    return this.grammar.list(q.level);
  }

  /** Khai báo TRƯỚC `:slug`. */
  @Public()
  @Get('search')
  search(@Query('q') q = '') {
    return this.grammar.search(q);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.grammar.get(slug);
  }
}
