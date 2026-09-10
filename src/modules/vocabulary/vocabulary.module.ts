import { Module } from '@nestjs/common';
import { HskLevelsService } from './hsk-levels.service';
import { VocabularyController } from './vocabulary.controller';
import { WordsService } from './words.service';

@Module({
  controllers: [VocabularyController],
  providers: [WordsService, HskLevelsService],
  exports: [WordsService, HskLevelsService],
})
export class VocabularyModule {}
