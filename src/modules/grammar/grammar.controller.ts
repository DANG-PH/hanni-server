import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GrammarService } from './grammar.service';

class GrammarQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;
}

@ApiTags('grammar')
@ApiBearerAuth()
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}

  @Get('levels')
  levels() {
    return this.grammar.levels();
  }

  @Get()
  list(@Query() q: GrammarQuery) {
    return this.grammar.list(q.level);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.grammar.get(slug);
  }
}
