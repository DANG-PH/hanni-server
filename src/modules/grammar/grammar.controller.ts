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
  @Get('levels')
  levels() {
    return this.grammar.levels();
  }

  @Public()
  @Get()
  list(@Query() q: GrammarQuery) {
    return this.grammar.list(q.level);
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.grammar.get(slug);
  }
}
