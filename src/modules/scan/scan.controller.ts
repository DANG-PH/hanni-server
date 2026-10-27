import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { ScanService } from './scan.service';
import { SCAN_MAX_BYTES } from './scan.util';

/**
 * BẢN ĐỒ — giao diện nào gọi các route của file này (sinh từ mã nguồn ngày 27/10/2026; thêm/sửa route thì sửa
 * khối này cho khớp). Địa chỉ đầy đủ = https://hanni-api.dangpham.id.vn/api + route; chạy local có Swagger ở
 * http://localhost:8000/api/docs. Quyền: [khách] không cần đăng nhập · [khách+] khách gọi được, đã đăng nhập thì
 * server biết là ai · [đăng nhập] thiếu cookie phiên là 401 · [admin]. "client:" = file trong hanni-client/ gọi route.
 *
 * GET       /scan/usage  [đăng nhập]  Số lượt quét ảnh còn lại hôm nay ở /tu-dien/quet
 *                                     → usage() → ScanService.usage()
 *                                     client: lib/scan.ts (useScanUsage)
 * POST      /scan        [đăng nhập]  Chụp / chọn / dán ảnh ở /tu-dien/quet → AI đọc chữ Hán + gọi tên đồ vật
 *                                     → scanImage() → ScanService.scan()
 *                                     client: lib/scan.ts (scanImage)
 */
@ApiTags('scan')
@ApiBearerAuth()
@Controller('scan')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Get('usage')
  usage(@CurrentUser() user: AuthUser) {
    return this.scan.usage(user.id);
  }

  /** Quét 1 ảnh (field `image`) — xem ScanService. */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: SCAN_MAX_BYTES } }),
  )
  scanImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu ảnh cần quét');
    return this.scan.scan(user.id, file);
  }
}
