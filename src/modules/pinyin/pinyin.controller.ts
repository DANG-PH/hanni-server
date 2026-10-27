import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PinyinService } from './pinyin.service';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /pinyin/overview  [khách]      Bảng phiên âm /phien-am (bảng ghép âm, tỉ lệ đoán thanh theo Hán Việt)
 *                                          → overview() → PinyinService.overview()
 *                                          client: app/(site)/phien-am/page.tsx · components/pinyin/use-pinyin.ts
 */
@ApiTags('pinyin')
@Controller('pinyin')
export class PinyinController {
  constructor(private readonly pinyin: PinyinService) {}

  /** Bảng phiên âm công khai: âm tiết có ghi âm thật + quy luật Hán Việt → thanh. */
  @Public()
  @Get('overview')
  overview() {
    return this.pinyin.overview();
  }
}
