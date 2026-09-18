import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class MessagesPageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class TranslateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

/** "Dịch trước khi gửi" — dịch nội dung đang soạn sang ngôn ngữ đích TRƯỚC
 * khi thực sự gửi tin (khác `TranslateMessageDto`, vốn dịch 1 tin nhắn ĐÃ
 * gửi để đọc). */
export class TranslateComposeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @IsIn(['zh', 'vi'])
  targetLang!: 'zh' | 'vi';
}
