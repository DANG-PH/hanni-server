import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AskAssistantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  /** Bỏ trống để tự tiếp tục cuộc trò chuyện gần nhất (hoặc tạo mới nếu chưa có). */
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
