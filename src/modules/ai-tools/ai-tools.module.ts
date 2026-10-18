import { Module } from '@nestjs/common';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [VocabularyModule],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}
