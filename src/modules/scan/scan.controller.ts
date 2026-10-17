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
