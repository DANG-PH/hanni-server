import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressListener } from './progress.listener';
import { ProgressService } from './progress.service';

@Module({
  controllers: [ProgressController],
  providers: [ProgressService, ProgressListener],
  exports: [ProgressService],
})
export class ProgressModule {}
