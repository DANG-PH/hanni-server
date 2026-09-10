import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';

@Module({
  controllers: [GrammarController],
  providers: [GrammarService],
})
export class GrammarModule {}
